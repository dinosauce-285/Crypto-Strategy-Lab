import type { NewsItem } from '@csl/contracts';

export interface FetchNewsOptions {
  coins?: string[];
  from?: number; // epoch ms
  to?: number;   // epoch ms
  limit?: number;
}

/**
 * Abstract port for crypto news providers (e.g. CryptoCompare REST API, RSS feeds).
 * Decouples ingestion and news storage from source-specific protocols.
 */
export abstract class NewsProviderPort {
  abstract readonly name: string;
  abstract fetchNews(options?: FetchNewsOptions): Promise<Omit<NewsItem, 'id'>[]>;
}
