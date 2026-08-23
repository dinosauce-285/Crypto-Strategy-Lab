import type { Candle } from '@csl/contracts';
import { SentimentCalculator, type ScoredArticle } from './sentiment.calculator';

function makeCandle(openTime: number): Candle {
  return {
    pair: 'BTCUSDT',
    timeframe: '1h',
    openTime,
    open: '100',
    high: '105',
    low: '95',
    close: '102',
    volume: '10',
    closed: true,
  };
}

describe('SentimentCalculator', () => {
  const HOUR = 3600000;
  const t0 = 1700000000000;
  const candles = [
    makeCandle(t0),
    makeCandle(t0 + HOUR),
    makeCandle(t0 + 2 * HOUR),
    makeCandle(t0 + 3 * HOUR),
  ];

  it('returns zeros when no articles are provided', () => {
    const calc = new SentimentCalculator([]);
    const result = calc.compute(candles, { windowHours: 1 });
    expect(result.value).toEqual([0, 0, 0, 0]);
  });

  it('aggregates articles causally within the specified lookback window', () => {
    const articles: ScoredArticle[] = [
      { publishedAt: t0 - 1800000, sentimentScore: 0.8 }, // 30m before t0
      { publishedAt: t0 + 1800000, sentimentScore: -0.6 }, // 30m after t0 (in window for t0 + 1hr)
      { publishedAt: t0 + 2 * HOUR, sentimentScore: 0.4 }, // exact at t0 + 2hr
    ];

    const calc = new SentimentCalculator(articles);
    const result = calc.compute(candles, { windowHours: 1 });

    // candle 0 (t0): window [t0 - 1hr, t0] -> article 1 (0.8) -> 0.8
    expect(result.value[0]).toBe(0.8);

    // candle 1 (t0 + 1hr): window [t0, t0 + 1hr] -> article 2 (-0.6) -> -0.6
    expect(result.value[1]).toBe(-0.6);

    // candle 2 (t0 + 2hr): window [t0 + 1hr, t0 + 2hr] -> article 3 (0.4) -> 0.4
    expect(result.value[2]).toBe(0.4);

    // candle 3 (t0 + 3hr): window [t0 + 2hr, t0 + 3hr] -> article 3 is at t0 + 2hr -> 0.4
    expect(result.value[3]).toBe(0.4);
  });

  it('does not leak future articles into earlier candles (strict causal guarantee)', () => {
    const futureArticle: ScoredArticle = {
      publishedAt: t0 + 2 * HOUR,
      sentimentScore: 0.99,
    };

    const calc = new SentimentCalculator([futureArticle]);
    const result = calc.compute(candles, { windowHours: 1 });

    expect(result.value[0]).toBe(0);
    expect(result.value[1]).toBe(0);
    expect(result.value[2]).toBe(0.99);
  });
});
