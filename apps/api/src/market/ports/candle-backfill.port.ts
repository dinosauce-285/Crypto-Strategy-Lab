import type { Timeframe } from '@csl/contracts';

/** Lets a caller outside `market` ask for a candle range to exist, without reaching into how (ADR 0041). */
export abstract class CandleBackfillPort {
  abstract ensureRange(pair: string, timeframe: Timeframe, from: number, to: number): Promise<void>;
}
