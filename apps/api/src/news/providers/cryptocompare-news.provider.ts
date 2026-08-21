import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NewsItem } from '@csl/contracts';
import { NewsProviderPort, type FetchNewsOptions } from '../ports/news-provider.port';

const DEFAULT_URL = 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';

interface CryptoCompareRawArticle {
  id?: string;
  guid?: string;
  published_on?: number;
  imageurl?: string;
  title?: string;
  url?: string;
  body?: string;
  tags?: string;
  categories?: string;
  source_info?: {
    name?: string;
    lang?: string;
    img?: string;
  };
  source?: string;
}

interface CryptoCompareApiResponse {
  Type?: number;
  Message?: string;
  Response?: string;
  Data?: CryptoCompareRawArticle[];
}

@Injectable()
export class CryptoCompareNewsProvider extends NewsProviderPort {
  readonly name = 'CryptoCompare';
  private readonly logger = new Logger(CryptoCompareNewsProvider.name);

  constructor(@Optional() private readonly config?: ConfigService) {
    super();
  }

  async fetchNews(options?: FetchNewsOptions): Promise<Omit<NewsItem, 'id'>[]> {
    const rawUrl = this.config?.get<string>('CRYPTOCOMPARE_NEWS_URL', DEFAULT_URL) ?? DEFAULT_URL;
    const url = new URL(rawUrl);

    if (options?.coins && options.coins.length > 0) {
      url.searchParams.set('categories', options.coins.join(','));
    }

    if (options?.to !== undefined) {
      url.searchParams.set('lTs', Math.floor(options.to / 1000).toString());
    }

    const apiKey = this.config?.get<string>('CRYPTOCOMPARE_API_KEY');
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (apiKey) {
      headers['authorization'] = `Apikey ${apiKey}`;
    }

    const response = await fetch(url.toString(), { headers });
    if (!response.ok) {
      throw new Error(`CryptoCompare news request failed: HTTP ${response.status}`);
    }

    const json = (await response.json()) as CryptoCompareApiResponse;
    if (json.Response === 'Error') {
      throw new Error(`CryptoCompare news error: ${json.Message || 'Unknown error'}`);
    }

    if (!Array.isArray(json.Data)) {
      return [];
    }

    const crawledAt = Date.now();
    let items: Omit<NewsItem, 'id'>[] = json.Data.map((raw) => {
      const publishedAt = (raw.published_on ?? 0) * 1000;
      const relatedCoins = this.parseRelatedCoins(raw.categories, raw.tags);

      return {
        title: raw.title?.trim() ?? '',
        content: raw.body?.trim() ?? '',
        source: raw.source_info?.name || raw.source || 'CryptoCompare',
        url: raw.url || raw.guid || '',
        publishedAt,
        crawledAt,
        relatedCoins,
      };
    });

    if (options?.from !== undefined) {
      items = items.filter((item) => item.publishedAt >= options.from!);
    }

    if (options?.to !== undefined) {
      items = items.filter((item) => item.publishedAt <= options.to!);
    }

    if (options?.coins && options.coins.length > 0) {
      const requestedCoins = new Set(options.coins.map((c) => c.toUpperCase()));
      items = items.filter((item) => item.relatedCoins.some((coin) => requestedCoins.has(coin)));
    }

    if (options?.limit !== undefined && options.limit > 0) {
      items = items.slice(0, options.limit);
    }

    return items;
  }

  private parseRelatedCoins(categories?: string, tags?: string): string[] {
    const tokens = new Set<string>();

    const extractTokens = (str?: string) => {
      if (!str) return;
      const parts = str.split(/[|,;]/);
      for (const part of parts) {
        const trimmed = part.trim().toUpperCase();
        if (trimmed.length > 0) {
          tokens.add(trimmed);
        }
      }
    };

    extractTokens(categories);
    extractTokens(tags);

    return Array.from(tokens);
  }
}
