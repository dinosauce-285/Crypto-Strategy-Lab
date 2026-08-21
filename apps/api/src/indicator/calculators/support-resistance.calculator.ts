import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

const DEFAULT_PIVOT_LOOKBACK = 5;
const DEFAULT_MERGE_THRESHOLD_PCT = 0.5;

interface Zone {
  level: number;
  count: number;
}

/**
 * Fractal pivots, confirmed only once `pivotLookback` candles exist on both sides,
 * clustered into zones within `mergeThresholdPct` of each other (ADR 0029). `support`
 * is the nearest support zone at or below the close, `resistance` the nearest at or
 * above; `NaN` until a zone exists on that side.
 */
export const supportResistanceCalculator: IndicatorCalculator = {
  name: 'support-resistance',
  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const pivotLookback = params.pivotLookback ?? DEFAULT_PIVOT_LOOKBACK;
    const mergeThresholdFraction = (params.mergeThresholdPct ?? DEFAULT_MERGE_THRESHOLD_PCT) / 100;

    const lows = candles.map((candle) => Number(candle.low));
    const highs = candles.map((candle) => Number(candle.high));
    const closes = candles.map((candle) => Number(candle.close));
    const length = candles.length;
    const support = new Array<number>(length).fill(NaN);
    const resistance = new Array<number>(length).fill(NaN);

    const supportZones: Zone[] = [];
    const resistanceZones: Zone[] = [];

    for (let index = 0; index < length; index += 1) {
      const confirmIndex = index - pivotLookback;
      if (confirmIndex >= 0) {
        if (isPivotLow(lows, confirmIndex, pivotLookback)) {
          mergeIntoZone(supportZones, lows[confirmIndex], mergeThresholdFraction);
        }
        if (isPivotHigh(highs, confirmIndex, pivotLookback)) {
          mergeIntoZone(resistanceZones, highs[confirmIndex], mergeThresholdFraction);
        }
      }
      support[index] = nearestZoneAtOrBelow(supportZones, closes[index]);
      resistance[index] = nearestZoneAtOrAbove(resistanceZones, closes[index]);
    }

    return { support, resistance };
  },
};

function isPivotLow(lows: readonly number[], index: number, lookback: number): boolean {
  if (index - lookback < 0 || index + lookback >= lows.length) return false;
  const level = lows[index];
  for (let j = index - lookback; j <= index + lookback; j += 1) {
    if (j !== index && lows[j] < level) return false;
  }
  return true;
}

function isPivotHigh(highs: readonly number[], index: number, lookback: number): boolean {
  if (index - lookback < 0 || index + lookback >= highs.length) return false;
  const level = highs[index];
  for (let j = index - lookback; j <= index + lookback; j += 1) {
    if (j !== index && highs[j] > level) return false;
  }
  return true;
}

function mergeIntoZone(zones: Zone[], price: number, mergeThresholdFraction: number): void {
  for (const zone of zones) {
    if (Math.abs(price - zone.level) / zone.level <= mergeThresholdFraction) {
      zone.level = (zone.level * zone.count + price) / (zone.count + 1);
      zone.count += 1;
      return;
    }
  }
  zones.push({ level: price, count: 1 });
}

function nearestZoneAtOrBelow(zones: readonly Zone[], price: number): number {
  let best = NaN;
  for (const zone of zones) {
    if (zone.level <= price && (Number.isNaN(best) || zone.level > best)) {
      best = zone.level;
    }
  }
  return best;
}

function nearestZoneAtOrAbove(zones: readonly Zone[], price: number): number {
  let best = NaN;
  for (const zone of zones) {
    if (zone.level >= price && (Number.isNaN(best) || zone.level < best)) {
      best = zone.level;
    }
  }
  return best;
}
