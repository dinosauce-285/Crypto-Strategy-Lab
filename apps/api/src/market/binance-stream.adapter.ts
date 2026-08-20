import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Candle, Timeframe } from '@csl/contracts';
import {
  ExchangeStreamPort,
  type ExchangeStream,
  type ExchangeStreamHandlers,
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

const DEFAULT_URL = 'wss://stream.binance.com:9443/ws';

@Injectable()
export class BinanceStreamAdapter extends ExchangeStreamPort {
  private readonly logger = new Logger(BinanceStreamAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  open(pair: string, handlers: ExchangeStreamHandlers): ExchangeStream {
    const url = this.config.get<string>('BINANCE_WS_URL', DEFAULT_URL);
    const symbol = pair.toLowerCase();
    const socket = new WebSocket(url);

    let ready = false;
    let nextId = 1;
    const pending: string[] = [];
    const send = (method: 'SUBSCRIBE' | 'UNSUBSCRIBE', streams: string[]) => {
      if (streams.length === 0) return;
      if (!ready) {
        if (method === 'SUBSCRIBE') pending.push(...streams);
        return;
      }
      socket.send(JSON.stringify({ method, params: streams, id: nextId++ }));
    };

    socket.addEventListener('open', () => {
      ready = true;
      const streams = [`${symbol}@trade`, ...pending.splice(0)];
      socket.send(JSON.stringify({ method: 'SUBSCRIBE', params: streams, id: nextId++ }));
      this.logger.log(`${pair} upstream open`);
    });

    socket.addEventListener('message', (event) => {
      const frame = parse(String(event.data));
      if (!frame) return;
      if (frame.e === 'trade') {
        // isBuyerMaker: true means the resting order was a buy, so the trade that
        // matched it was a sell from the taker's side (ADR 0024).
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

    // A dropped connection is left as it falls — reconnecting and backfilling the
    // candles it missed is T09.
    socket.addEventListener('error', () => this.logger.warn(`${pair} upstream error`));
    socket.addEventListener('close', () => {
      ready = false;
      this.logger.log(`${pair} upstream closed`);
    });

    return {
      addTimeframe: (timeframe) => send('SUBSCRIBE', [`${symbol}@kline_${timeframe}`]),
      removeTimeframe: (timeframe) =>
        send('UNSUBSCRIBE', [`${symbol}@kline_${timeframe}`]),
      close: () => socket.close(),
    };
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
