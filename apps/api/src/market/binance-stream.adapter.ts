import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Candle, Timeframe } from '@csl/contracts';
import {
  ExchangeStreamPort,
  type ExchangeStream,
  type ExchangeStreamHandlers,
  type HistoricalRangeQuery,
} from './ports/exchange-stream.port';

interface BinanceTrade {
  e: 'trade';
  s: string;
  p: string;
  q: string;
  T: number;
  m: boolean;
}

interface BinanceKline {
  e: 'kline';
  k: {
    s: string;
    i: string;
    t: number;
    o: string;
    h: string;
    l: string;
    c: string;
    v: string;
    x: boolean;
  };
}

const DEFAULT_WS_URL = 'wss://stream.binance.com:9443/ws';
const DEFAULT_REST_URL = 'https://api.binance.com';
const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_INITIAL_BACKOFF_MS = 1000;
const DEFAULT_MAX_BACKOFF_MS = 10000;
const DEFAULT_HEALTHY_TIMEOUT_MS = 5000;
const DEFAULT_WATCHDOG_TIMEOUT_MS = 30000;

@Injectable()
export class BinanceStreamAdapter extends ExchangeStreamPort {
  private readonly logger = new Logger(BinanceStreamAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  open(pair: string, handlers: ExchangeStreamHandlers): ExchangeStream {
    const wsUrl = this.config.get<string>('BINANCE_WS_URL', DEFAULT_WS_URL);
    const maxRetries = this.config.get<number>('BINANCE_MAX_RETRIES', DEFAULT_MAX_RETRIES);
    const initialBackoff = this.config.get<number>(
      'BINANCE_INITIAL_BACKOFF_MS',
      DEFAULT_INITIAL_BACKOFF_MS,
    );
    const maxBackoff = this.config.get<number>(
      'BINANCE_MAX_BACKOFF_MS',
      DEFAULT_MAX_BACKOFF_MS,
    );
    const healthyTimeout = this.config.get<number>(
      'BINANCE_HEALTHY_TIMEOUT_MS',
      DEFAULT_HEALTHY_TIMEOUT_MS,
    );
    const watchdogTimeout = this.config.get<number>(
      'BINANCE_WATCHDOG_TIMEOUT_MS',
      DEFAULT_WATCHDOG_TIMEOUT_MS,
    );

    const symbol = pair.toLowerCase();
    const activeStreams = new Set<string>([`${symbol}@trade`]);

    let socket: WebSocket | null = null;
    let nextId = 1;
    let retries = 0;
    let explicitClose = false;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let healthyTimer: NodeJS.Timeout | null = null;
    let watchdogTimer: NodeJS.Timeout | null = null;

    const resetWatchdog = () => {
      if (watchdogTimer) clearTimeout(watchdogTimer);
      if (explicitClose) return;
      watchdogTimer = setTimeout(() => {
        this.logger.warn(
          `${pair} watchdog detected silent dead connection (no data for ${watchdogTimeout}ms)`,
        );
        try {
          socket?.close();
        } catch {
          // ignore
        }
        handleDrop();
      }, watchdogTimeout);
    };

    const send = (method: 'SUBSCRIBE' | 'UNSUBSCRIBE', streams: string[]) => {
      if (!socket || socket.readyState !== WebSocket.OPEN || streams.length === 0) return;
      socket.send(JSON.stringify({ method, params: streams, id: nextId++ }));
    };

    const handleDrop = () => {
      if (explicitClose) return;

      if (healthyTimer) {
        clearTimeout(healthyTimer);
        healthyTimer = null;
      }
      if (watchdogTimer) {
        clearTimeout(watchdogTimer);
        watchdogTimer = null;
      }

      if (retries < maxRetries) {
        retries++;
        handlers.status?.('reconnecting');
        const baseDelay = Math.min(maxBackoff, initialBackoff * 2 ** (retries - 1));
        const jitter = baseDelay * (0.8 + 0.4 * Math.random());
        this.logger.warn(
          `${pair} dropped, reconnecting attempt ${retries}/${maxRetries} in ${Math.round(jitter)}ms`,
        );
        reconnectTimer = setTimeout(connect, jitter);
      } else {
        handlers.status?.('failed');
        this.logger.error(`${pair} upstream recovery failed after ${maxRetries} retries`);
      }
    };

    const connect = () => {
      if (explicitClose) return;

      socket = new WebSocket(wsUrl);

      socket.addEventListener('open', () => {
        const wasReconnecting = retries > 0;

        // Only reset retries once the connection has proven stable
        if (healthyTimer) clearTimeout(healthyTimer);
        healthyTimer = setTimeout(() => {
          retries = 0;
          healthyTimer = null;
        }, healthyTimeout);

        resetWatchdog();

        const streams = Array.from(activeStreams);
        if (streams.length > 0) {
          socket?.send(JSON.stringify({ method: 'SUBSCRIBE', params: streams, id: nextId++ }));
        }
        this.logger.log(`${pair} upstream open`);
        if (wasReconnecting) {
          handlers.status?.('connected');
        }
      });

      socket.addEventListener('message', (event) => {
        resetWatchdog();
        const frame = parse(String(event.data));
        if (!frame) return;
        if (frame.e === 'trade') {
          handlers.price({
            pair: frame.s,
            price: frame.p,
            at: frame.T,
            volume: frame.q,
            side: frame.m ? 'sell' : 'buy',
          });
          return;
        }
        if (frame.k.x) handlers.candle(toCandle(frame));
      });

      socket.addEventListener('error', () => {
        this.logger.warn(`${pair} upstream error`);
        handleDrop();
      });

      socket.addEventListener('close', () => {
        if (explicitClose) {
          this.logger.log(`${pair} upstream closed explicitly`);
          return;
        }
        handleDrop();
      });
    };

    connect();

    return {
      addTimeframe: (timeframe) => {
        const stream = `${symbol}@kline_${timeframe}`;
        activeStreams.add(stream);
        send('SUBSCRIBE', [stream]);
      },
      removeTimeframe: (timeframe) => {
        const stream = `${symbol}@kline_${timeframe}`;
        activeStreams.delete(stream);
        send('UNSUBSCRIBE', [stream]);
      },
      close: () => {
        explicitClose = true;
        if (reconnectTimer) clearTimeout(reconnectTimer);
        if (healthyTimer) clearTimeout(healthyTimer);
        if (watchdogTimer) clearTimeout(watchdogTimer);
        socket?.close();
      },
    };
  }

  async fetchCandles(query: HistoricalRangeQuery): Promise<Candle[]> {
    const restUrl = this.config.get<string>('BINANCE_REST_URL', DEFAULT_REST_URL);
    const limit = query.limit ?? 1000;
    const url = new URL('/api/v3/klines', restUrl);
    url.searchParams.set('symbol', query.pair.toUpperCase());
    url.searchParams.set('interval', query.timeframe);
    url.searchParams.set('startTime', String(query.startTime));
    if (query.endTime) {
      url.searchParams.set('endTime', String(query.endTime));
    }
    url.searchParams.set('limit', String(limit));

    const maxHttpRetries = 3;
    let attempt = 0;

    while (attempt < maxHttpRetries) {
      attempt++;
      try {
        const response = await fetch(url.toString());
        if (response.status === 429 || response.status === 418) {
          const retryAfterHeader = response.headers?.get('Retry-After');
          const retryAfterSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 0;
          const waitMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
            ? retryAfterSec * 1000
            : 1000 * 2 ** (attempt - 1);
          this.logger.warn(
            `Binance REST 429 rate limit hit for ${query.pair} ${query.timeframe}. Backing off for ${waitMs}ms (attempt ${attempt}/${maxHttpRetries})`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs));
          continue;
        }

        if (!response.ok) {
          throw new Error(
            `Failed to fetch candles from Binance REST: ${response.status} ${response.statusText}`,
          );
        }

        const raw = (await response.json()) as (string | number)[][];
        const now = Date.now();
        return raw
          .filter((kline) => (kline[6] !== undefined ? Number(kline[6]) <= now : true))
          .map((kline) => ({
            pair: query.pair.toUpperCase(),
            timeframe: query.timeframe,
            openTime: Number(kline[0]),
            open: String(kline[1]),
            high: String(kline[2]),
            low: String(kline[3]),
            close: String(kline[4]),
            volume: String(kline[5]),
            closed: true,
          }));
      } catch (err) {
        if (attempt >= maxHttpRetries) throw err;
        const backoffMs = 500 * 2 ** (attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
      }
    }

    throw new Error(
      `Exceeded max retries fetching candles from Binance REST for ${query.pair} ${query.timeframe}`,
    );
  }
}

function parse(raw: string): BinanceTrade | BinanceKline | null {
  try {
    const frame: unknown = JSON.parse(raw);
    if (typeof frame !== 'object' || frame === null || !('e' in frame)) return null;
    const event = (frame as { e: unknown }).e;
    if (event === 'trade') return frame as BinanceTrade;
    if (event === 'kline') return frame as BinanceKline;
    return null;
  } catch {
    return null;
  }
}

function toCandle(frame: BinanceKline): Candle {
  const k = frame.k;
  return {
    pair: k.s,
    timeframe: k.i as Timeframe,
    openTime: k.t,
    open: k.o,
    high: k.h,
    low: k.l,
    close: k.c,
    volume: k.v,
    closed: k.x,
  };
}
