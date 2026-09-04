import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

/**
 * MACD. `line` = EMA(fastPeriod) - EMA(slowPeriod); `signal` = EMA(signalPeriod) of
 * `line`; `histogram` = line - signal. One pass computes all three (ADR 0028), and
 * each EMA is seeded with a simple average over its first window so the series stays
 * deterministic and NaN until enough candles exist — same convention as `rsi`.
 */
export const macdCalculator: IndicatorCalculator = {
  name: 'macd',
  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const { fastPeriod, slowPeriod, signalPeriod } = params;
    const closes = candles.map((candle) => Number(candle.close));

    const emaFast = ema(closes, fastPeriod);
    const emaSlow = ema(closes, slowPeriod);
    const line = emaFast.map((fast, i) => fast - emaSlow[i]);
    const signal = ema(line, signalPeriod);
    const histogram = line.map((value, i) => value - signal[i]);

    return { line, signal, histogram };
  },
};

/** Simple-average-seeded EMA. `NaN` in the input (not yet computable) stays `NaN` in the output. */
function ema(values: readonly number[], period: number): number[] {
  const result = new Array<number>(values.length).fill(NaN);
  const k = 2 / (period + 1);

  let seedSum = 0;
  let seedCount = 0;
  let seeded = false;

  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    if (!seeded) {
      if (!Number.isFinite(value)) continue;
      seedSum += value;
      seedCount += 1;
      if (seedCount === period) {
        result[i] = seedSum / period;
        seeded = true;
      }
      continue;
    }
    const previous = result[i - 1];
    result[i] = value * k + previous * (1 - k);
  }

  return result;
}
