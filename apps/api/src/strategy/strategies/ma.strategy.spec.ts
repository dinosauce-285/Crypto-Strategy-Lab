import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { movingAverageCalculator } from '../../indicator/calculators/moving-average.calculator';
import { buildCandles } from '../../indicator/calculators/test-candles';
import { MAStrategy, maStrategyMeta } from './ma.strategy';

interface GoldenSignal extends Signal {
  index: number;
}

const params = { fastPeriod: 2, slowPeriod: 3 };
const candles = buildCandles([5, 4, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2]);

describe('MAStrategy', () => {
  it('describes the moving average crossover strategy', () => {
    expect(maStrategyMeta).toMatchObject({
      id: 'ma',
      name: 'Moving Average Crossover',
      group: 'Trend',
      version: 1,
      warmup: 200,
    });
    expect(maStrategyMeta.params.map((param) => param.name)).toEqual(['fastPeriod', 'slowPeriod']);
  });

  it('declares moving-average requests from its parameters', () => {
    const strategy = new MAStrategy(params);

    expect(strategy.requires({ fastPeriod: 10, slowPeriod: 20 })).toEqual([
      { source: 'ma', params: { period: 10 } },
      { source: 'ma', params: { period: 20 } },
    ]);
  });

  it('matches the golden crossover output', () => {
    const strategy = new MAStrategy(params);
    const golden = readGolden();

    expect(golden.map(({ index }) => index)).toEqual([4, 5, 8]);
    expect(golden.map(({ index }) => strategy.analyze(contextAt(index)))).toEqual(
      golden.map(({ direction, strength }) => ({ direction, strength })),
    );
  });
});

function contextAt(index: number): StrategyContext {
  const cache = new Map<string, readonly number[]>();
  return {
    candles,
    index,
    get(request: DataRequest): readonly number[] {
      const key = `${request.source}:${JSON.stringify(request.params)}`;
      const cached = cache.get(key);
      if (cached) return cached;
      if (request.source !== 'ma') throw new Error(`unexpected request ${request.source}`);
      const series = movingAverageCalculator.compute(candles, request.params).value;
      cache.set(key, series);
      return series;
    },
  };
}

function readGolden(): GoldenSignal[] {
  const path = join(__dirname, 'fixtures', 'ma-strategy.golden.json');
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenSignal[];
}
