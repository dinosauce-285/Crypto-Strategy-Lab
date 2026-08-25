import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

export interface ScoredArticle {
  publishedAt: number;
  sentimentScore: number;
}

export class SentimentCalculator implements IndicatorCalculator {
  readonly name = 'sentiment';

  constructor(private readonly articles: readonly ScoredArticle[] = []) {}

  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const windowHours = params.windowHours ?? 1;
    const windowMs = windowHours * 60 * 60 * 1000;
    const values = new Array<number>(candles.length);

    for (let i = 0; i < candles.length; i++) {
      const candleOpenTime = candles[i].openTime;
      const windowStart = candleOpenTime - windowMs;

      let sum = 0;
      let count = 0;
      for (const article of this.articles) {
        // Strictly causal: publishedAt <= candleOpenTime (no lookahead)
        if (article.publishedAt <= candleOpenTime && article.publishedAt >= windowStart) {
          sum += article.sentimentScore;
          count++;
        }
      }

      values[i] = count > 0 ? Number((sum / count).toFixed(4)) : 0;
    }

    return { value: values };
  }
}

export const sentimentCalculator = new SentimentCalculator();
