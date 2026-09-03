import type { Candle, StrategyParams } from '@csl/contracts';
import type { IndicatorCalculator } from './calculator';

export interface ScoredArticle {
  publishedAt: number;
  sentimentScore: number;
  relatedCoins?: string[];
}

export class SentimentCalculator implements IndicatorCalculator {
  readonly name = 'sentiment';

  constructor(private articles: readonly ScoredArticle[] = []) {}

  setArticles(articles: readonly ScoredArticle[]): void {
    this.articles = articles;
  }

  getArticles(): readonly ScoredArticle[] {
    return this.articles;
  }

  compute(candles: readonly Candle[], params: StrategyParams): Record<string, number[]> {
    const windowHours = params.windowHours ?? 1;
    const windowMs = windowHours * 60 * 60 * 1000;
    const values = new Array<number>(candles.length);

    const targetCoin = extractCoin(candles[0]?.pair);

    const relevantArticles = targetCoin
      ? this.articles.filter((article) => {
          if (!article.relatedCoins || article.relatedCoins.length === 0) {
            return true;
          }
          return article.relatedCoins.some((c) => c.toUpperCase() === targetCoin);
        })
      : this.articles;

    for (let i = 0; i < candles.length; i++) {
      const candleOpenTime = candles[i].openTime;
      const windowStart = candleOpenTime - windowMs;

      let sum = 0;
      let count = 0;
      for (const article of relevantArticles) {
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

function extractCoin(coinOrPair?: string): string | undefined {
  if (!coinOrPair) return undefined;
  const upper = coinOrPair.trim().toUpperCase();
  const stripped = upper.replace(/(USDT|BUSD|USDC|USD)$/, '');
  return stripped.length > 0 ? stripped : upper;
}

