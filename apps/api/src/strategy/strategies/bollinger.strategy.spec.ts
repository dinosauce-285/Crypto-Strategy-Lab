import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { buildCandles } from '../../indicator/calculators/test-candles';
import { BollingerStrategy, bollingerStrategyMeta } from './bollinger.strategy';

interface GoldenSignal extends Signal {
  index: number;
}

const params = { period: 20, stdDevMultiplier: 2 };
const candles = buildCandles([8, 10, 12]);
const lower = [9, 9, 9];
const upper = [11, 11, 11];

describe('BollingerStrategy', () => {
  it('describes the Bollinger band reversion strategy', () => {
    expect(bollingerStrategyMeta).toMatchObject({
      id: 'bollinger',
      name: 'Bollinger Band Reversion',
      group: 'Volatility',
      version: 1,
      warmup: 50,
    });
    expect(bollingerStrategyMeta.params.map((param) => param.name)).toEqual(['period', 'stdDevMultiplier']);
  });

  it('declares Bollinger band requests from its parameters', () => {
    const strategy = new BollingerStrategy(params);

    expect(strategy.requires({ period: 30, stdDevMultiplier: 2.5 })).toEqual([
      { source: 'bollinger.lower', params: { period: 30, stdDevMultiplier: 2.5 } },
      { source: 'bollinger.upper', params: { period: 30, stdDevMultiplier: 2.5 } },
    ]);
  });

  it('matches the golden Bollinger output', () => {
    const strategy = new BollingerStrategy(params);
    const golden = readGolden();

    expectSignals(golden.map(({ index }) => strategy.analyze(contextAt(index))), golden);
  });
});

function contextAt(index: number): StrategyContext {
  return {
    candles,
    index,
    get(request: DataRequest): readonly number[] {
      if (request.source === 'bollinger.lower') return lower;
      if (request.source === 'bollinger.upper') return upper;
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
  const path = join(__dirname, 'fixtures', 'bollinger-strategy.golden.json');
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenSignal[];
}
