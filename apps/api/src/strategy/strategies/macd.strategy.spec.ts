import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { macdCalculator } from '../../indicator/calculators/macd.calculator';
import { buildCandles } from '../../indicator/calculators/test-candles';
import { MACDStrategy, macdStrategyMeta } from './macd.strategy';

interface GoldenSignal extends Signal {
  index: number;
}

const params = { fastPeriod: 2, slowPeriod: 3, signalPeriod: 2 };
const candles = buildCandles([10, 11, 12, 11, 10, 9, 10, 11, 12, 13, 12, 10, 8]);

describe('MACDStrategy', () => {
  it('describes the MACD crossover strategy', () => {
    expect(macdStrategyMeta).toMatchObject({
      id: 'macd',
      name: 'MACD Crossover',
      group: 'Trend',
      version: 1,
      warmup: 55,
    });
    expect(macdStrategyMeta.params.map((param) => param.name)).toEqual([
      'fastPeriod',
      'slowPeriod',
      'signalPeriod',
    ]);
  });

  it('declares its MACD line and signal requests from its parameters', () => {
    const strategy = new MACDStrategy(params);

    expect(strategy.requires({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 })).toEqual([
      { source: 'macd.line', params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
      { source: 'macd.signal', params: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 } },
    ]);
  });

  it('matches the golden crossover output', () => {
    const strategy = new MACDStrategy(params);
    const golden = readGolden();

    expect(golden.map(({ index }) => index)).toEqual([6, 7, 10]);
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
      const [name, field] = request.source.split('.');
      if (name !== 'macd') throw new Error(`unexpected request ${request.source}`);
      const series = macdCalculator.compute(candles, request.params)[field];
      cache.set(key, series);
      return series;
    },
  };
}

function readGolden(): GoldenSignal[] {
  const path = join(__dirname, 'fixtures', 'macd-strategy.golden.json');
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenSignal[];
}
