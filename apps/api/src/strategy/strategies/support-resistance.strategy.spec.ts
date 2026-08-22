import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { buildCandles } from '../../indicator/calculators/test-candles';
import { SupportResistanceStrategy, supportResistanceStrategyMeta } from './support-resistance.strategy';

interface GoldenSignal extends Signal {
  index: number;
}

const params = {
  pivotLookback: 5,
  mergeThresholdPct: 0.5,
  proximityPct: 0.5,
  breakoutPct: 0.5,
};
const candles = buildCandles([100.1, 119.7, 121, 112]);
const support = [100, 100, 100, 100];
const resistance = [120, 120, 120, 120];

describe('SupportResistanceStrategy', () => {
  it('describes the support resistance reaction strategy', () => {
    expect(supportResistanceStrategyMeta).toMatchObject({
      id: 'support-resistance',
      name: 'Support Resistance Reaction',
      group: 'Structure',
      version: 1,
      warmup: 20,
    });
    expect(supportResistanceStrategyMeta.params.map((param) => param.name)).toEqual([
      'pivotLookback',
      'mergeThresholdPct',
      'proximityPct',
      'breakoutPct',
    ]);
  });

  it('declares support and resistance requests from its indicator parameters', () => {
    const strategy = new SupportResistanceStrategy(params);

    expect(
      strategy.requires({
        pivotLookback: 3,
        mergeThresholdPct: 0.8,
        proximityPct: 1,
        breakoutPct: 0.3,
      }),
    ).toEqual([
      { source: 'support-resistance.support', params: { pivotLookback: 3, mergeThresholdPct: 0.8 } },
      { source: 'support-resistance.resistance', params: { pivotLookback: 3, mergeThresholdPct: 0.8 } },
    ]);
  });

  it('matches the golden support resistance output', () => {
    const strategy = new SupportResistanceStrategy(params);
    const golden = readGolden();

    expectSignals(golden.map(({ index }) => strategy.analyze(contextAt(index))), golden);
  });
});

function contextAt(index: number): StrategyContext {
  return {
    candles,
    index,
    get(request: DataRequest): readonly number[] {
      if (request.source === 'support-resistance.support') return support;
      if (request.source === 'support-resistance.resistance') return resistance;
      throw new Error(`unexpected request ${request.source}`);
    },
  };
}

function expectSignals(actual: Signal[], expected: GoldenSignal[]): void {
  actual.forEach((signal, index) => {
    expect(signal.direction).toBe(expected[index].direction);
    expect(signal.strength).toBeCloseTo(expected[index].strength);
  });
}

function readGolden(): GoldenSignal[] {
  const path = join(__dirname, 'fixtures', 'support-resistance-strategy.golden.json');
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenSignal[];
}
