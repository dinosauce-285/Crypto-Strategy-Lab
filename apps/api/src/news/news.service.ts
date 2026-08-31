import { Inject, Injectable, Logger, NotFoundException, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS, type NewsItem } from '@csl/contracts';
import { NewsRepository, type FindManyNewsQuery } from './news.repository';
import { NewsProviderPort, NEWS_PROVIDERS, type FetchNewsOptions } from './ports/news-provider.port';

export { NEWS_PROVIDERS };

export interface CollectNewsOptions extends FetchNewsOptions {
  source?: string;
}

export interface CollectNewsResult {
  collected: number;
  inserted: number;
  newsIds: string[];
}

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);
  private readonly providers: NewsProviderPort[];

  constructor(
    private readonly repository: NewsRepository,
    private readonly events: EventEmitter2,
    @Optional() @Inject(NEWS_PROVIDERS) providers?: NewsProviderPort[],
  ) {
    this.providers = providers ?? [];
  }

  async collect(options?: CollectNewsOptions): Promise<CollectNewsResult> {
    const targetProviders = options?.source
      ? this.providers.filter(
          (provider) => provider.name.toLowerCase() === options.source!.toLowerCase(),
        )
      : this.providers;

    if (targetProviders.length === 0) {
      if (options?.source) {
        this.logger.warn(`No news provider found matching source: ${options.source}`);
        throw new NotFoundException(`Nguồn tin "${options.source}" không tồn tại`);
      }
      return { collected: 0, inserted: 0, newsIds: [] };
    }

    const results = await Promise.allSettled(
      targetProviders.map((provider) => provider.fetchNews(options)),
    );

    const allArticles: Omit<NewsItem, 'id'>[] = [];
    for (let i = 0; i < results.length; i++) {
      const res = results[i];
      const provider = targetProviders[i];
      if (res.status === 'fulfilled') {
        allArticles.push(...res.value);
      } else {
        const message = res.reason instanceof Error ? res.reason.message : String(res.reason);
        this.logger.warn(`News provider ${provider.name} failed: ${message}`);
      }
    }

    if (allArticles.length === 0) {
      return { collected: 0, inserted: 0, newsIds: [] };
    }

    const { insertedIds } = await this.repository.upsertMany(allArticles);
    const collected = allArticles.length;
    const inserted = insertedIds.length;

    if (inserted > 0) {
      const source =
        options?.source ?? (targetProviders.length === 1 ? targetProviders[0].name : 'all');

      this.events.emit(EVENTS.NewsCollected, {
        newsIds: insertedIds,
        source,
      });
    }

    return {
      collected,
      inserted,
      newsIds: insertedIds,
    };
  }

  async getNews(query: FindManyNewsQuery): Promise<{ items: NewsItem[]; total: number }> {
    return this.repository.findMany(query);
  }

  async getById(id: string): Promise<NewsItem | null> {
    return this.repository.findById(id);
  }
}
