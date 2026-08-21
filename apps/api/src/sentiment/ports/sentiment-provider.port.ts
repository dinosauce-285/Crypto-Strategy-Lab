import type { Sentiment } from '@csl/contracts';

/**
 * Abstract port for sentiment analysis providers (e.g. Groq API, Heuristic keyword classifier).
 * Decouples ingestion and strategy consumption from specific sentiment models (ADR 0005).
 */
export abstract class SentimentProviderPort {
  abstract readonly name: string;
  abstract analyze(text: string): Promise<Sentiment>;
}

export const SENTIMENT_PROVIDER = 'SENTIMENT_PROVIDER';
