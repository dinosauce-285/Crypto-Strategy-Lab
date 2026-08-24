import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Candle, Timeframe } from '@csl/contracts';
import { ExchangeHistoryPort } from './ports/exchange-history.port';

type BinanceKlineRow = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  ...unknown[],
];

const DEFAULT_URL = 'https://api.binance.com';

/** Binance's klines cap — the largest page obtainable in one call (ADR 0023/0041). */
const CHUNK_LIMIT = 1000;

/** Self-imposed spacing between paginated calls — nowhere near the real limit, just discipline (ADR 0041). */
const CHUNK_DELAY_MS = 150;

@Injectable()
export class BinanceRestAdapter extends ExchangeHistoryPort {
  private readonly logger = new Logger(BinanceRestAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async fetchKlines(pair: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
    const base = this.config.get<string>('BINANCE_REST_URL', DEFAULT_URL);
    const url = `${base}/api/v3/klines?symbol=${pair}&interval=${timeframe}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance klines request failed: HTTP ${response.status}`);
    }

    const rows = (await response.json()) as BinanceKlineRow[];
    return rows.map((row) => toCandle(row, pair, timeframe));
  }

  async fetchRange(pair: string, timeframe: Timeframe, from: number, to: number): Promise<Candle[]> {
    const candles: Candle[] = [];
    let currentStart = from;

    while (currentStart <= to) {
      const chunk = await this.fetchChunk(pair, timeframe, currentStart, to);
      if (chunk.length === 0) break;
      candles.push(...chunk);

      const lastInChunk = chunk[chunk.length - 1];
      if (chunk.length < CHUNK_LIMIT || lastInChunk.openTime >= to) break;

      currentStart = lastInChunk.openTime + 1;
      await sleep(CHUNK_DELAY_MS);
    }

    return candles;
  }

  private async fetchChunk(
    pair: string,
    timeframe: Timeframe,
    startTime: number,
    endTime: number,
  ): Promise<Candle[]> {
    const base = this.config.get<string>('BINANCE_REST_URL', DEFAULT_URL);
    const url =
      `${base}/api/v3/klines?symbol=${pair}&interval=${timeframe}` +
      `&startTime=${startTime}&endTime=${endTime}&limit=${CHUNK_LIMIT}`;

    const response = await this.fetchWithRateLimitRetry(url);
    const rows = (await response.json()) as BinanceKlineRow[];
    return rows.map((row) => toCandle(row, pair, timeframe));
  }

  /** One retry on 429, waiting exactly what Binance asks for — never more than that (ADR 0041). */
  private async fetchWithRateLimitRetry(url: string): Promise<Response> {
    const response = await fetch(url);
    if (response.ok) return response;

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get('Retry-After')) || 1;
      this.logger.warn(`Binance rate limit hit, waiting ${retryAfterSeconds}s before one retry`);
      await sleep(retryAfterSeconds * 1000);

      const retried = await fetch(url);
      if (retried.ok) return retried;
      throw new Error(`Binance klines request failed after rate-limit retry: HTTP ${retried.status}`);
    }

    throw new Error(`Binance klines request failed: HTTP ${response.status}`);
  }
}

function toCandle(row: BinanceKlineRow, pair: string, timeframe: Timeframe): Candle {
  const [openTime, open, high, low, close, volume] = row;
  return { pair, timeframe, openTime, open, high, low, close, volume, closed: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
