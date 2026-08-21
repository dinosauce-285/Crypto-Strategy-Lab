import { supportResistanceCalculator } from './support-resistance.calculator';
import { buildCandles } from './test-candles';

describe('supportResistanceCalculator', () => {
  it('confirms a pivot low only after pivotLookback candles exist past it, and no earlier', () => {
    // pivot low at index 4 (value 5), confirmed once index 6 exists (4 + lookback 2)
    const candles = buildCandles([10, 9, 8, 7, 5, 7, 8, 9, 10, 11]);
    const { support } = supportResistanceCalculator.compute(candles, { pivotLookback: 2 });

    expect(support[5]).toBeNaN();
    expect(support[6]).toBeCloseTo(5);
    expect(support[9]).toBeCloseTo(5);
  });

  it('confirms a pivot high the same way, into the resistance series', () => {
    // pivot high at index 4 (value 5), confirmed once index 6 exists
    const candles = buildCandles([0, 1, 2, 3, 5, 3, 2, 1, 0, -1]);
    const { resistance } = supportResistanceCalculator.compute(candles, { pivotLookback: 2 });

    expect(resistance[5]).toBeNaN();
    expect(resistance[6]).toBeCloseTo(5);
  });

  it('merges two pivot lows within mergeThresholdPct into one zone', () => {
    // pivot low at index 1 (100), confirmed at index 2; a second pivot low at index 4
    // (100.3, 0.3% away) confirmed at index 5. Merged, the zone reads 100.15 — a
    // reader who sees 100 or 100.3 instead knows the merge did not happen.
    const candles = buildCandles([110, 100, 105, 110, 100.3, 108, 115]);
    const { support } = supportResistanceCalculator.compute(candles, {
      pivotLookback: 1,
      mergeThresholdPct: 0.5,
    });

    expect(support[1]).toBeNaN();
    expect(support[2]).toBeCloseTo(100);
    expect(support[6]).toBeCloseTo(100.15);
  });

  it('is NaN until a zone exists on that side', () => {
    const candles = buildCandles([10, 9, 8, 7, 5, 7, 8, 9, 10, 11]);
    const { resistance } = supportResistanceCalculator.compute(candles, { pivotLookback: 2 });
    expect(resistance.every((value) => Number.isNaN(value))).toBe(true);
  });

  it('is causal: truncating candles does not change earlier values', () => {
    const candles = buildCandles([10, 9, 8, 7, 5, 7, 8, 9, 10, 11]);
    const full = supportResistanceCalculator.compute(candles, { pivotLookback: 2 });
    const truncated = supportResistanceCalculator.compute(candles.slice(0, 7), { pivotLookback: 2 });
    expect(truncated.support).toEqual(full.support.slice(0, 7));
    expect(truncated.resistance).toEqual(full.resistance.slice(0, 7));
  });
});
