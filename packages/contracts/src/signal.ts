export const DIRECTIONS = ['BUY', 'SELL', 'HOLD'] as const;
export type Direction = (typeof DIRECTIONS)[number];

/**
 * What a strategy answers at one candle.
 *
 * `strength` is a strategy's confidence in its own call, never a comparison
 * against another strategy — the composite multiplies it into that strategy's own
 * weight and nothing else. A strategy with nothing to add returns 1 and behaves
 * exactly like a plain BUY / SELL / HOLD.
 *
 * It carries a second meaning for a strategy whose signal is a moment rather than
 * a state: a crossing that happened three candles ago speaks with a smaller
 * strength than one happening now, so a single event is not drowned out by a
 * neighbour that repeats itself every candle.
 *
 * Not seeing enough data yet is not expressed here: a strategy declares its
 * warm-up length in `StrategyMeta` and the engine skips those candles.
 */
export interface Signal {
  direction: Direction;
  /** 0..1 */
  strength: number;
}
