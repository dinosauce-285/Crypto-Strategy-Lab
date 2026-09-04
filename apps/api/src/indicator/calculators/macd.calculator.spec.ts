import { macdCalculator } from './macd.calculator';
import { buildCandles } from './test-candles';

describe('macdCalculator', () => {
  // fastPeriod=2 valid from index1, slowPeriod=3 valid from index2, so `line` (needing
  // both) is valid from index2; `signal` (EMA(2) of `line`) is valid from index3.
  const candles = buildCandles([10, 11, 12, 11, 10, 9, 10]);
  const params = { fastPeriod: 2, slowPeriod: 3, signalPeriod: 2 };

  it('is NaN before each series has enough candles', () => {
    const { line, signal } = macdCalculator.compute(candles, params);
    expect(line[0]).toBeNaN();
    expect(line[1]).toBeNaN();
    expect(signal[0]).toBeNaN();
    expect(signal[2]).toBeNaN();
  });

  it('matches a hand-computed EMA(fast) - EMA(slow)', () => {
    const { line } = macdCalculator.compute(candles, params);
    // EMA(2) seeds at index1 = mean(10,11) = 10.5; EMA(3) seeds at index2 = mean(10,11,12) = 11.
    // line[2] = EMA(2)[2] - EMA(3)[2] = 11.5 - 11 = 0.5
    expect(line[2]).toBeCloseTo(0.5, 4);
    // EMA(2)[4] = 10*(2/3) + 11.16667*(1/3) = 10.38889; EMA(3)[4] = 10*0.5 + 11*0.5 = 10.5
    expect(line[4]).toBeCloseTo(-0.11111, 4);
  });

  it('matches a hand-computed signal as EMA(signalPeriod) of the MACD line', () => {
    const { signal, histogram, line } = macdCalculator.compute(candles, params);
    // seeds at index3 = mean(line[2], line[3]) = mean(0.5, 0.16667) = 0.33333
    expect(signal[3]).toBeCloseTo(0.33333, 4);
    // signal[4] = line[4]*(2/3) + signal[3]*(1/3) = -0.11111*(2/3) + 0.33333*(1/3)
    expect(signal[4]).toBeCloseTo(0.03704, 4);
    expect(histogram[4]).toBeCloseTo(line[4] - signal[4], 6);
  });

  it('is causal: truncating candles does not change earlier values', () => {
    const full = macdCalculator.compute(candles, params);
    const truncated = macdCalculator.compute(candles.slice(0, 5), params);
    expect(truncated.line).toEqual(full.line.slice(0, 5));
    expect(truncated.signal).toEqual(full.signal.slice(0, 5));
    expect(truncated.histogram).toEqual(full.histogram.slice(0, 5));
  });
});
