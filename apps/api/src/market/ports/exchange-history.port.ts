import type { Candle, Timeframe } from '@csl/contracts';

/** Behind this, nothing knows which exchange historical candles came from (ADR 0027). */
export abstract class ExchangeHistoryPort {
  abstract fetchKlines(pair: string, timeframe: Timeframe, limit: number): Promise<Candle[]>;

  /** Paginated; the exchange's per-call cap applies. Bounded by `to`, never open-ended (ADR 0041). */
  abstract fetchRange(pair: string, timeframe: Timeframe, from: number, to: number): Promise<Candle[]>;
}
