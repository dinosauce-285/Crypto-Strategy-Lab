import type { Timeframe } from './market';

export const ENTRY_PRICES = ['signal-close', 'next-open'] as const;
export type EntryPrice = (typeof ENTRY_PRICES)[number];

export const PROFIT_MODES = ['simple', 'compound'] as const;
export type ProfitMode = (typeof PROFIT_MODES)[number];

export const DRAWDOWN_MODES = ['trade-close', 'per-candle'] as const;
export type DrawdownMode = (typeof DRAWDOWN_MODES)[number];

/**
 * How a run is judged. These sit inside a dataset rather than in configuration so
 * that changing one produces a new dataset with an empty leaderboard, instead of
 * silently making every existing result incomparable while it stays on the board.
 *
 * The values in use are a team decision and are not fixed here — this is the shape.
 */
export interface BacktestRules {
  entryPrice: EntryPrice;
  /** Fraction of notional per side, as a decimal string. `"0"` for no fees. */
  feeRate: string;
  warmupCandles: number;
  profitMode: ProfitMode;
  drawdownMode: DrawdownMode;
}

/**
 * What a run was measured against. Two candidates may only share a leaderboard if
 * they point at the same `id`.
 */
export interface Dataset {
  id: string;
  pair: string;
  timeframe: Timeframe;
  /** Epoch milliseconds, `from` inclusive and `to` exclusive. */
  from: number;
  to: number;
  rules: BacktestRules;
}
