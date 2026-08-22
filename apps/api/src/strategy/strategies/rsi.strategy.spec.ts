import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { buildCandles } from '../../indicator/calculators/test-candles';
import { RSIStrategy, rsiStrategyMeta } from './rsi.strategy';

interface GoldenSignal extends Signal {
  index: number;
}

const params = { period: 14, buyThreshold: 30, sellThreshold: 70 };
const candles = buildCandles([1, 2, 3, 4]);
const rsiSeries = [NaN, 25, 50, 75];

describe('RSIStrategy', () => {
  it('describes the RSI reversal strategy', () => {
    expect(rsiStrategyMeta).toMatchObject({
      id: 'rsi',
      name: 'RSI Reversal',
      group: 'Momentum',
      version: 1,
      warmup: 21,
    });
    expect(rsiStrategyMeta.params.map((param) => param.name)).toEqual([
      'period',
      'buyThreshold',
      'sellThreshold',
    ]);
  });

  it('declares its RSI request from its parameters', () => {
    const strategy = new RSIStrategy(params);

    expect(strategy.requires({ period: 21, buyThreshold: 25, sellThreshold: 75 })).toEqual([
      { source: 'rsi', params: { period: 21 } },
    ]);
  });

  it('matches the golden RSI output', () => {
    const strategy = new RSIStrategy(params);
    const golden = readGolden();

    expectSignals(golden.map(({ index }) => strategy.analyze(contextAt(index))), golden);
  });
});

function contextAt(index: number): StrategyContext {
  return {
    candles,
    index,
    get(request: DataRequest): readonly number[] {
      if (request.source !== 'rsi') throw new Error(`unexpected request ${request.source}`);
      return rsiSeries;
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
  const path = join(__dirname, 'fixtures', 'rsi-strategy.golden.json');
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenSignal[];
}
