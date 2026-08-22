import type { Candle, DataRequest } from '@csl/contracts';

/**
 * Behind this, nothing knows how an indicator is computed or cached — a strategy's
 * `StrategyContext.get` and a future chart endpoint both resolve through here rather
 * than the concrete `IndicatorService` (ADR 0020, `BACKEND_CONSTRAINT.md`).
 */
export abstract class IndicatorPort {
  abstract compute(datasetId: string, candles: readonly Candle[], request: DataRequest): readonly number[];
}
