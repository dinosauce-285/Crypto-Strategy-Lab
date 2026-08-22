import type { Candle, Timeframe } from '@csl/contracts';

export interface GetCandlesQueryDto {
  pair: string;
  timeframe: Timeframe;
  limit?: number;
  /** Epoch ms, inclusive. Given together with `to`, or not at all (ADR 0026). */
  from?: number;
  /** Epoch ms, inclusive. Given together with `from`, or not at all (ADR 0026). */
  to?: number;
}

export interface GetCandlesResponseDto {
  candles: Candle[];
}
