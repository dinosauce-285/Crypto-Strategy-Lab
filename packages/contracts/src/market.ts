/**
 * One candle. The raw unit everything else is derived from.
 * Timestamps are epoch milliseconds, prices and volume are decimal strings so
 * nothing is lost to floating point before it reaches the database.
 */
export interface Candle {
  pair: string;
  timeframe: Timeframe;
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closed: boolean;
}

export const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
