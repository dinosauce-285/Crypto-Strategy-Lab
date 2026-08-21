import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

/**
 * Wilder's RSI. `NaN` until `period` price changes exist — the first value needs
 * candles `0..period`.
 */
export const rsiCalculator: IndicatorCalculator = {
  name: 'rsi',
  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const period = params.period;
    const closes = candles.map((candle) => Number(candle.close));
    const value = new Array<number>(closes.length).fill(NaN);

    if (closes.length <= period) {
      return { value };
    }

    let gainSum = 0;
    let lossSum = 0;
    for (let i = 1; i <= period; i += 1) {
      const delta = closes[i] - closes[i - 1];
      gainSum += Math.max(delta, 0);
      lossSum += Math.max(-delta, 0);
    }
    let avgGain = gainSum / period;
    let avgLoss = lossSum / period;
    value[period] = rsiFromAverages(avgGain, avgLoss);

    for (let i = period + 1; i < closes.length; i += 1) {
      const delta = closes[i] - closes[i - 1];
      const gain = Math.max(delta, 0);
      const loss = Math.max(-delta, 0);
      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;
      value[i] = rsiFromAverages(avgGain, avgLoss);
    }

    return { value };
  },
};

function rsiFromAverages(avgGain: number, avgLoss: number): number {
  if (avgLoss === 0) {
    return avgGain === 0 ? 50 : 100;
  }
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}
