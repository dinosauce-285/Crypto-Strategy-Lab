import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

const DEFAULT_STD_DEV_MULTIPLIER = 2;

/**
 * `middle` is the SMA; `upper`/`lower` are `middle +/- stdDevMultiplier * population
 * stddev`, sharing one pass over the window (ADR 0028) rather than three.
 */
export const bollingerBandsCalculator: IndicatorCalculator = {
  name: 'bollinger',
  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const period = params.period;
    const multiplier = params.stdDevMultiplier ?? DEFAULT_STD_DEV_MULTIPLIER;
    const closes = candles.map((candle) => Number(candle.close));
    const middle = new Array<number>(closes.length).fill(NaN);
    const upper = new Array<number>(closes.length).fill(NaN);
    const lower = new Array<number>(closes.length).fill(NaN);

    for (let i = period - 1; i < closes.length; i += 1) {
      const window = closes.slice(i - period + 1, i + 1);
      const mean = window.reduce((sum, value) => sum + value, 0) / period;
      const variance = window.reduce((sum, value) => sum + (value - mean) ** 2, 0) / period;
      const stdDev = Math.sqrt(variance);
      middle[i] = mean;
      upper[i] = mean + multiplier * stdDev;
      lower[i] = mean - multiplier * stdDev;
    }

    return { upper, middle, lower };
  },
};
