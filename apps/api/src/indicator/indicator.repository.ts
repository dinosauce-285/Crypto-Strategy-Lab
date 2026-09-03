import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ScoredArticle } from './calculators/sentiment.calculator';

@Injectable()
export class IndicatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findScoredArticles(coin?: string): Promise<ScoredArticle[]> {
    const where: { sentimentScore: { not: null }; relatedCoins?: { has: string } } = {
      sentimentScore: { not: null },
    };

    if (coin) {
      where.relatedCoins = { has: coin.toUpperCase() };
    }

    const rows = await this.prisma.news.findMany({
      where,
      select: {
        publishedAt: true,
        sentimentScore: true,
        relatedCoins: true,
      },
      orderBy: {
        publishedAt: 'asc',
      },
    });

    return rows.map((row) => ({
      publishedAt: row.publishedAt.getTime(),
      sentimentScore: row.sentimentScore ?? 0,
      relatedCoins: row.relatedCoins,
    }));
  }
}
