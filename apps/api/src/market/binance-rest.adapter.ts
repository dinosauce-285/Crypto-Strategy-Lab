import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    const url = this.buildKlinesUrl(base, {
      symbol: pair,
      interval: timeframe,
      limit: String(limit),
    });

    const response = await fetch(url);
    if (!response.ok) {
      throw await this.toKlinesError(response, pair);
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
    const url = this.buildKlinesUrl(base, {
      symbol: pair,
      interval: timeframe,
      startTime: String(startTime),
      endTime: String(endTime),
      limit: String(CHUNK_LIMIT),
    });

    const response = await this.fetchWithRateLimitRetry(url, pair);
    const rows = (await response.json()) as BinanceKlineRow[];
    return rows.map((row) => toCandle(row, pair, timeframe));
  }

  private buildKlinesUrl(base: string, params: Record<string, string>): string {
    const url = new URL('/api/v3/klines', base);
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.toString();
  }

  /** One retry on 429, waiting exactly what Binance asks for — never more than that (ADR 0041). */
  private async fetchWithRateLimitRetry(url: string, pair: string): Promise<Response> {
    const response = await fetch(url);
    if (response.ok) return response;

    if (response.status === 429) {
      const retryAfterSeconds = Number(response.headers.get('Retry-After')) || 1;
      this.logger.warn(`Binance rate limit hit, waiting ${retryAfterSeconds}s before one retry`);
      await sleep(retryAfterSeconds * 1000);

      const retried = await fetch(url);
      if (retried.ok) return retried;
      throw await this.toKlinesError(retried, pair);
    }

    throw await this.toKlinesError(response, pair);
  }

  /**
   * `pair` is the only user-supplied part of a klines request (timeframe is validated
   * against the Timeframe enum before it ever gets here), so a 400 from Binance always
   * means the symbol was rejected — map it to a real "not found" instead of a 500.
   */
  private async toKlinesError(response: Response, pair: string): Promise<Error> {
    if (response.status === 400) {
      return new NotFoundException(`Cặp giao dịch "${pair}" không tồn tại`);
    }
    return new Error(`Binance klines request failed: HTTP ${response.status}`);
  }
}

function toCandle(row: BinanceKlineRow, pair: string, timeframe: Timeframe): Candle {
  const [openTime, open, high, low, close, volume] = row;
  return { pair, timeframe, openTime, open, high, low, close, volume, closed: true };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
