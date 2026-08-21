import { bollingerBandsCalculator } from './bollinger-bands.calculator';
import { buildCandles } from './test-candles';

describe('bollingerBandsCalculator', () => {
  const candles = buildCandles([1, 2, 3, 4, 5]);

  it('is NaN before the period has elapsed', () => {
    const { upper, middle, lower } = bollingerBandsCalculator.compute(candles, { period: 3 });
    expect(middle[0]).toBeNaN();
    expect(upper[1]).toBeNaN();
    expect(lower[1]).toBeNaN();
  });

  it('matches a hand-computed mean and population stddev', () => {
    // window [1,2,3]: mean 2, population variance 2/3, stddev sqrt(2/3)
    const { upper, middle, lower } = bollingerBandsCalculator.compute(candles, { period: 3 });
    const stdDev = Math.sqrt(2 / 3);
    expect(middle[2]).toBeCloseTo(2);
    expect(upper[2]).toBeCloseTo(2 + 2 * stdDev);
    expect(lower[2]).toBeCloseTo(2 - 2 * stdDev);
  });

  it('respects a custom stdDevMultiplier', () => {
    const stdDev = Math.sqrt(2 / 3);
    const { upper, lower } = bollingerBandsCalculator.compute(candles, { period: 3, stdDevMultiplier: 1 });
    expect(upper[2]).toBeCloseTo(2 + stdDev);
    expect(lower[2]).toBeCloseTo(2 - stdDev);
  });

  it('is causal: truncating candles does not change earlier values', () => {
    const full = bollingerBandsCalculator.compute(candles, { period: 3 });
    const truncated = bollingerBandsCalculator.compute(candles.slice(0, 4), { period: 3 });
    expect(truncated.middle).toEqual(full.middle.slice(0, 4));
    expect(truncated.upper).toEqual(full.upper.slice(0, 4));
    expect(truncated.lower).toEqual(full.lower.slice(0, 4));
  });
});
