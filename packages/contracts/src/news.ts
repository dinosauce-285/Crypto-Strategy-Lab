export const SENTIMENT_LABELS = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const;
export type SentimentLabel = (typeof SENTIMENT_LABELS)[number];

/**
 * Classified once when the article arrives and stored beside it, so backtests, the
 * sentiment strategy and the demo all read the same numbers and nothing calls the
 * model twice.
 */
export interface Sentiment {
  label: SentimentLabel;
  /** -1..1 — signed, because section 30 buys above 0.7 and sells below -0.7. */
  score: number;
}

/** The eight normalised fields of section 27, plus the classification of section 29. */
export interface NewsItem {
  id: string;
  title: string;
  content: string;
  source: string;
  publishedAt: number;
  crawledAt: number;
  relatedCoins: string[];
  url: string;
  /** Absent until the provider has classified it. */
  sentiment?: Sentiment;
}
