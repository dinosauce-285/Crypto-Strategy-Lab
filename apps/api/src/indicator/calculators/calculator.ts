import type { Candle, StrategyParams } from '@csl/contracts';

/**
 * One field per series, even for a single-series indicator (`{ value: [...] }`), so
 * `IndicatorService` has one dispatch path regardless of how many series an indicator
 * produces (ADR 0028).
 */
export interface IndicatorCalculator {
  readonly name: string;
  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]>;
}

/** Registering a new indicator is one file plus one line here (ADR 0012's pattern, applied). */
export function buildCalculatorRegistry(calculators: readonly IndicatorCalculator[]): Map<string, IndicatorCalculator> {
  const registry = new Map<string, IndicatorCalculator>();
  for (const calculator of calculators) {
    registry.set(calculator.name, calculator);
  }
  return registry;
}
