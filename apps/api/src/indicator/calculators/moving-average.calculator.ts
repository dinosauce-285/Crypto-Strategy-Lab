import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

/** Simple moving average of `close`, `NaN` until `period` candles exist. */
export const movingAverageCalculator: IndicatorCalculator = {
  name: 'ma',
  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const period = params.period;
    const closes = candles.map((candle) => Number(candle.close));
    const value = new Array<number>(closes.length).fill(NaN);

    let windowSum = 0;
    for (let i = 0; i < closes.length; i += 1) {
      windowSum += closes[i];
      if (i >= period) {
        windowSum -= closes[i - period];
      }
      if (i >= period - 1) {
        value[i] = windowSum / period;
      }
    }

    return { value };
  },
};
