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

/** Section 3 walks a user through 15m → 30m and 1h → 2h; section 5 lists six — ADR 0046. */
export const TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '1d'] as const;
export type Timeframe = (typeof TIMEFRAMES)[number];
