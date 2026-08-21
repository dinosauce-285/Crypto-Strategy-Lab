import { Injectable } from '@nestjs/common';
import type { Candle, DataRequest, StrategyParams } from '@csl/contracts';
import { IndicatorPort } from './ports/indicator.port';
import { buildCalculatorRegistry } from './calculators/calculator';
import { movingAverageCalculator } from './calculators/moving-average.calculator';
import { rsiCalculator } from './calculators/rsi.calculator';
import { bollingerBandsCalculator } from './calculators/bollinger-bands.calculator';
import { supportResistanceCalculator } from './calculators/support-resistance.calculator';

const DEFAULT_FIELD = 'value';

/**
 * The two callers ADR 0008 names — the backtest engine's `StrategyContext` and, later,
 * a chart endpoint — both resolve through `IndicatorPort`, never this class directly.
 *
 * Cached in memory per process, keyed by `(datasetId, indicator name, params)` (ADR
 * 0028): a fifth indicator is one calculator plus one registry line, and a
 * multi-series indicator's fields share one cache entry and one computed pass.
 */
@Injectable()
export class IndicatorService extends IndicatorPort {
  private readonly registry = buildCalculatorRegistry([
    movingAverageCalculator,
    rsiCalculator,
    bollingerBandsCalculator,
    supportResistanceCalculator,
  ]);

  private readonly cache = new Map<string, Record<string, number[]>>();

  compute(datasetId: string, candles: readonly Candle[], request: DataRequest): readonly number[] {
    const [name, field = DEFAULT_FIELD] = request.source.split('.');
    const calculator = this.registry.get(name);
    if (!calculator) {
      throw new Error(`No indicator registered for source "${request.source}"`);
    }

    const cacheKey = this.cacheKey(datasetId, name, request.params);
    let result = this.cache.get(cacheKey);
    if (!result) {
      result = calculator.compute(candles, request.params);
      this.cache.set(cacheKey, result);
    }

    const series = result[field];
    if (!series) {
      throw new Error(`Indicator "${name}" has no field "${field}" (source "${request.source}")`);
    }
    return series;
  }

  private cacheKey(datasetId: string, name: string, params: StrategyParams): string {
    return `${datasetId}::${name}::${stableParamsKey(params)}`;
  }
}

function stableParamsKey(params: StrategyParams): string {
  const sortedKeys = Object.keys(params).sort();
  return JSON.stringify(sortedKeys.map((key) => [key, params[key]]));
}
