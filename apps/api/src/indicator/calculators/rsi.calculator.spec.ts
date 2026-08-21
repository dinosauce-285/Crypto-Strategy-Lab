import { rsiCalculator } from './rsi.calculator';
import { buildCandles } from './test-candles';

describe('rsiCalculator', () => {
  it('is NaN before period deltas exist', () => {
    const candles = buildCandles([10, 12, 11]);
    const { value } = rsiCalculator.compute(candles, { period: 3 });
    expect(value[0]).toBeNaN();
    expect(value[1]).toBeNaN();
    expect(value[2]).toBeNaN();
  });

  it('matches a hand-computed value at the warmup boundary', () => {
    // deltas: +2, -1, +2 -> avgGain 4/3, avgLoss 1/3, RS 4, RSI 100 - 100/5 = 80
    const candles = buildCandles([10, 12, 11, 13]);
    const { value } = rsiCalculator.compute(candles, { period: 3 });
    expect(value[3]).toBeCloseTo(80);
  });

  it('saturates at 100 when every change is a gain', () => {
    const candles = buildCandles([1, 2, 3, 4, 5, 6, 7]);
    const { value } = rsiCalculator.compute(candles, { period: 3 });
    expect(value[3]).toBeCloseTo(100);
    expect(value[6]).toBeCloseTo(100);
  });

  it('saturates at 0 when every change is a loss', () => {
    const candles = buildCandles([7, 6, 5, 4, 3, 2, 1]);
    const { value } = rsiCalculator.compute(candles, { period: 3 });
    expect(value[3]).toBeCloseTo(0);
    expect(value[6]).toBeCloseTo(0);
  });

  it('is causal: truncating candles does not change earlier values', () => {
    const candles = buildCandles([10, 12, 11, 13, 15, 14, 16]);
    const full = rsiCalculator.compute(candles, { period: 3 }).value;
    const truncated = rsiCalculator.compute(candles.slice(0, 5), { period: 3 }).value;
    expect(truncated).toEqual(full.slice(0, 5));
  });
});
