import type { Candle } from '@csl/contracts';

/** A minimal candle for calculator tests — only price fields matter here. */
export function buildCandle(fields: { close: number; high?: number; low?: number }): Candle {
  const { close, high = close, low = close } = fields;
  return {
    pair: 'BTCUSDT',
    timeframe: '5m',
    openTime: 0,
    open: String(close),
    high: String(high),
    low: String(low),
    close: String(close),
    volume: '0',
    closed: true,
  };
}

export function buildCandles(closes: readonly number[]): Candle[] {
  return closes.map((close) => buildCandle({ close }));
}
