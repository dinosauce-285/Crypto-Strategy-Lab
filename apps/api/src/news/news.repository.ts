import { Injectable } from '@nestjs/common';
import type { NewsItem, SentimentLabel } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface FindManyNewsQuery {
  coin?: string;
  source?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

/**
 * The only class touching PrismaService for news (BACKEND_CONSTRAINT.md).
 * Handles persistent storage, deduplication on URL, and mapping between
 * Prisma database rows and @csl/contracts NewsItem domain shapes.
 */
@Injectable()
export class NewsRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Deduplicates articles by URL in memory and inserts any new records into PostgreSQL
   * using skipDuplicates to safely ignore articles that already exist.
   * Returns the IDs of all newly inserted articles.
   */
  async upsertMany(items: Omit<NewsItem, 'id'>[]): Promise<{ insertedIds: string[] }> {
    if (items.length === 0) {
      return { insertedIds: [] };
    }

    const uniqueByUrl = new Map<string, Omit<NewsItem, 'id'>>();
    for (const item of items) {
      if (!uniqueByUrl.has(item.url)) {
        uniqueByUrl.set(item.url, item);
      }
    }

    const rows = Array.from(uniqueByUrl.values()).map(toRow);
    if (rows.length === 0) {
      return { insertedIds: [] };
    }

    const inserted = await this.prisma.news.createManyAndReturn({
      data: rows,
      skipDuplicates: true,
      select: { id: true },
    });

    return {
      insertedIds: inserted.map((row) => row.id),
    };
  }

  /**
   * Finds news matching query filters (coin, date range) with pagination.
   * Returns items ordered by publishedAt descending along with the total matching count.
   */
  async findMany(query: FindManyNewsQuery): Promise<{ items: NewsItem[]; total: number }> {
    const where: Prisma.NewsWhereInput = {};

    if (query.coin) {
      where.relatedCoins = { has: query.coin.toUpperCase() };
    }

    if (query.source) {
      where.source = { contains: query.source, mode: 'insensitive' };
    }

    if (query.from !== undefined || query.to !== undefined) {
      where.publishedAt = {};
      if (query.from !== undefined) {
        where.publishedAt.gte = new Date(query.from);
      }
      if (query.to !== undefined) {
        where.publishedAt.lte = new Date(query.to);
      }
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.news.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: query.limit,
        skip: query.offset,
      }),
      this.prisma.news.count({ where }),
    ]);

    return {
      items: rows.map(fromRow),
      total,
    };
  }

  /**
   * Finds a single news article by its primary key ID.
   */
  async findById(id: string): Promise<NewsItem | null> {
    const row = await this.prisma.news.findUnique({
      where: { id },
    });

    return row ? fromRow(row) : null;
  }
}

/**
 * Converts a domain NewsItem input to a Prisma row creation payload.
 */
export function toRow(item: Omit<NewsItem, 'id'>) {
  return {
    title: item.title,
    content: item.content,
    source: item.source,
    url: item.url,
    publishedAt: new Date(item.publishedAt),
    crawledAt: item.crawledAt ? new Date(item.crawledAt) : new Date(),
    relatedCoins: item.relatedCoins,
    sentimentLabel: item.sentiment?.label ?? null,
    sentimentScore: item.sentiment?.score ?? null,
  };
}

/**
 * Converts a database News row to a domain NewsItem shape.
 */
export function fromRow(row: {
  id: string;
  title: string;
  content: string;
  source: string;
  url: string;
  publishedAt: Date;
  crawledAt: Date;
  relatedCoins: string[];
  sentimentLabel: string | null;
  sentimentScore: number | null;
}): NewsItem {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    source: row.source,
    url: row.url,
    publishedAt: row.publishedAt.getTime(),
    crawledAt: row.crawledAt.getTime(),
    relatedCoins: row.relatedCoins,
    ...(row.sentimentLabel != null && row.sentimentScore != null
      ? {
          sentiment: {
            label: row.sentimentLabel as SentimentLabel,
            score: row.sentimentScore,
          },
        }
      : {}),
  };
}
