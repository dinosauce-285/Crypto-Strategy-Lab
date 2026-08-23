import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { buildCandles } from '../../indicator/calculators/test-candles';
import { SentimentStrategy, sentimentStrategyMeta } from './sentiment.strategy';

interface GoldenSignal extends Signal {
  index: number;
}

const params = { buyThreshold: 0.7, sellThreshold: -0.7, windowHours: 1 };
const candles = buildCandles([1, 2, 3, 4]);
const sentimentSeries = [NaN, 0.85, 0.1, -0.9];

describe('SentimentStrategy', () => {
  it('describes the news sentiment strategy', () => {
    expect(sentimentStrategyMeta).toMatchObject({
      id: 'sentiment',
      name: 'News Sentiment',
      group: 'Information',
      version: 1,
      warmup: 0,
    });
    expect(sentimentStrategyMeta.params.map((param) => param.name)).toEqual([
      'buyThreshold',
      'sellThreshold',
      'windowHours',
    ]);
  });

  it('declares its sentiment request from its parameters', () => {
    const strategy = new SentimentStrategy(params);

    expect(strategy.requires({ buyThreshold: 0.8, sellThreshold: -0.8, windowHours: 2 })).toEqual([
      { source: 'sentiment', params: { windowHours: 2 } },
    ]);
  });

  it('matches the golden sentiment output', () => {
    const strategy = new SentimentStrategy(params);
    const golden = readGolden();

    expectSignals(golden.map(({ index }) => strategy.analyze(contextAt(index))), golden);
  });
});

function contextAt(index: number): StrategyContext {
  return {
    candles,
    index,
    get(request: DataRequest): readonly number[] {
      if (request.source !== 'sentiment') throw new Error(`unexpected request ${request.source}`);
      return sentimentSeries;
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
  const path = join(__dirname, 'fixtures', 'sentiment-strategy.golden.json');
  return JSON.parse(readFileSync(path, 'utf8')) as GoldenSignal[];
}
