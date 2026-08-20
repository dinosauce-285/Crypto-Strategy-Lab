import type { Candle, Timeframe } from '@csl/contracts';

export interface GetCandlesQueryDto {
  pair: string;
  timeframe: Timeframe;
  limit?: number;
}

export interface GetCandlesResponseDto {
  candles: Candle[];
}
