import { movingAverageCalculator } from './moving-average.calculator';
import { buildCandles } from './test-candles';

describe('movingAverageCalculator', () => {
  const closes = [1, 2, 3, 4, 5, 6, 7];
  const candles = buildCandles(closes);

  it('is NaN before the period has elapsed', () => {
    const { value } = movingAverageCalculator.compute(candles, { period: 3 });
    expect(value[0]).toBeNaN();
    expect(value[1]).toBeNaN();
  });

  it('matches a hand-computed simple moving average', () => {
    const { value } = movingAverageCalculator.compute(candles, { period: 3 });
    expect(value[2]).toBeCloseTo((1 + 2 + 3) / 3);
    expect(value[3]).toBeCloseTo((2 + 3 + 4) / 3);
    expect(value[6]).toBeCloseTo((5 + 6 + 7) / 3);
  });

  it('is causal: truncating candles does not change earlier values', () => {
    const full = movingAverageCalculator.compute(candles, { period: 3 }).value;
    const truncated = movingAverageCalculator.compute(candles.slice(0, 4), { period: 3 }).value;
    expect(truncated).toEqual(full.slice(0, 4));
  });
});
