import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { EVENTS, type EventPayload, type NewsItem, type Sentiment } from '@csl/contracts';
import { SentimentRepository } from './sentiment.repository';
import { SentimentProviderPort, SENTIMENT_PROVIDER } from './ports/sentiment-provider.port';

function formatNewsText(item: NewsItem): string {
  const parts: string[] = [];
  if (item.title) {
    parts.push(item.title);
  }
  if (item.content) {
    parts.push(item.content);
  }
  return parts.join('\n\n');
}

@Injectable()
export class SentimentService {
  private readonly logger = new Logger(SentimentService.name);

  constructor(
    private readonly repository: SentimentRepository,
    private readonly events: EventEmitter2,
    @Inject(SENTIMENT_PROVIDER) private readonly provider: SentimentProviderPort,
  ) {}

  @OnEvent(EVENTS.NewsCollected)
  async onNewsCollected(payload: EventPayload<typeof EVENTS.NewsCollected>): Promise<void> {
    if (!payload?.newsIds || payload.newsIds.length === 0) {
      return;
    }

    const items = await this.repository.findUnscored(undefined, payload.newsIds);
    if (items.length === 0) {
      return;
    }

    for (const item of items) {
      try {
        const text = formatNewsText(item);
        const sentiment = await this.provider.analyze(text);
        const updated = await this.repository.updateSentiment(item.id, sentiment);
        if (updated) {
          this.events.emit(EVENTS.SentimentAnalyzed, {
            newsId: item.id,
            sentiment,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to analyze sentiment for news ${item.id}: ${message}`);
      }
    }
  }

  async analyzeArticle(id: string): Promise<NewsItem | null> {
    const items = await this.repository.findUnscored(1, [id]);
    if (items.length === 0) {
      return null;
    }

    const item = items[0];
    const text = formatNewsText(item);
    const sentiment = await this.provider.analyze(text);
    const updated = await this.repository.updateSentiment(id, sentiment);

    if (updated) {
      this.events.emit(EVENTS.SentimentAnalyzed, {
        newsId: id,
        sentiment,
      });
    }

    return updated;
  }

  async analyzeBatch(limit?: number): Promise<{ processed: number; updated: number }> {
    const items = await this.repository.findUnscored(limit);
    if (items.length === 0) {
      return { processed: 0, updated: 0 };
    }

    const updates: { id: string; sentiment: Sentiment }[] = [];

    for (const item of items) {
      try {
        const text = formatNewsText(item);
        const sentiment = await this.provider.analyze(text);
        updates.push({ id: item.id, sentiment });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to analyze sentiment for news ${item.id}: ${message}`);
      }
    }

    let updated = 0;
    if (updates.length > 0) {
      updated = await this.repository.updateSentimentBatch(updates);
      for (const u of updates) {
        this.events.emit(EVENTS.SentimentAnalyzed, {
          newsId: u.id,
          sentiment: u.sentiment,
        });
      }
    }

    return {
      processed: items.length,
      updated,
    };
  }

  async getStats(
    coin?: string,
  ): Promise<{ total: number; positive: number; neutral: number; negative: number; averageScore: number }> {
    return this.repository.getSentimentStats(coin);
  }
}
