import type { Candle, Timeframe } from '@csl/contracts';

/** Behind this, nothing knows which exchange historical candles came from (ADR 0027). */
export abstract class ExchangeHistoryPort {
  abstract fetchKlines(pair: string, timeframe: Timeframe, limit: number): Promise<Candle[]>;
}
