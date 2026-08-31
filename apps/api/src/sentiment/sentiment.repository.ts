import { Injectable } from '@nestjs/common';
import type { NewsItem, Sentiment, SentimentLabel } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const NOT_FOUND_CODE = 'P2025';

function isRecordNotFoundError(error: unknown): boolean {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === NOT_FOUND_CODE) ||
    (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === NOT_FOUND_CODE)
  );
}

@Injectable()
export class SentimentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<NewsItem | null> {
    const row = await this.prisma.news.findUnique({
      where: { id },
    });
    return row ? fromRow(row) : null;
  }

  async findUnscored(limit?: number, ids?: string[]): Promise<NewsItem[]> {
    if (ids !== undefined && ids.length === 0) {
      return [];
    }

    const where: Prisma.NewsWhereInput = {
      sentimentLabel: null,
    };

    if (ids && ids.length > 0) {
      where.id = { in: ids };
    }

    const rows = await this.prisma.news.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: limit,
    });

    return rows.map(fromRow);
  }

  async updateSentiment(id: string, sentiment: Sentiment): Promise<NewsItem | null> {
    try {
      const updated = await this.prisma.news.update({
        where: { id },
        data: {
          sentimentLabel: sentiment.label,
          sentimentScore: sentiment.score,
        },
      });

      return fromRow(updated);
    } catch (error) {
      if (isRecordNotFoundError(error)) {
        return null;
      }
      throw error;
    }
  }

  async updateSentimentBatch(updates: { id: string; sentiment: Sentiment }[]): Promise<number> {
    if (updates.length === 0) {
      return 0;
    }

    const results = await this.prisma.$transaction(
      updates.map((u) =>
        this.prisma.news.update({
          where: { id: u.id },
          data: {
            sentimentLabel: u.sentiment.label,
            sentimentScore: u.sentiment.score,
          },
        }),
      ),
    );

    return results.length;
  }

  async getSentimentStats(
    coin?: string,
  ): Promise<{ total: number; positive: number; neutral: number; negative: number; averageScore: number }> {
    const where: Prisma.NewsWhereInput = {
      sentimentLabel: { not: null },
    };

    if (coin) {
      where.relatedCoins = { has: coin.toUpperCase() };
    }

    const [groups, aggregate] = await this.prisma.$transaction([
      this.prisma.news.groupBy({
        by: ['sentimentLabel'],
        where,
        _count: { _all: true },
        orderBy: { sentimentLabel: 'asc' },
      }),
      this.prisma.news.aggregate({
        where,
        _count: { _all: true },
        _avg: { sentimentScore: true },
      }),
    ]);

    let positive = 0;
    let neutral = 0;
    let negative = 0;

    for (const group of groups) {
      let count = 0;
      if (typeof group._count === 'number') {
        count = group._count;
      } else if (typeof group._count === 'object' && group._count !== null) {
        count = group._count._all ?? 0;
      }

      if (group.sentimentLabel === 'POSITIVE') {
        positive = count;
      } else if (group.sentimentLabel === 'NEUTRAL') {
        neutral = count;
      } else if (group.sentimentLabel === 'NEGATIVE') {
        negative = count;
      }
    }

    const total = aggregate._count?._all ?? 0;
    const averageScore = aggregate._avg?.sentimentScore ?? 0;

    return {
      total,
      positive,
      neutral,
      negative,
      averageScore,
    };
  }
}

export function toRow(item: Omit<NewsItem, 'id'> | NewsItem) {
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
