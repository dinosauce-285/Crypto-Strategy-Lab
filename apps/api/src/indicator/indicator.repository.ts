import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { ScoredArticle } from './calculators/sentiment.calculator';

@Injectable()
export class IndicatorRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findScoredArticles(): Promise<ScoredArticle[]> {
    const rows = await this.prisma.news.findMany({
      where: {
        sentimentScore: { not: null },
      },
      select: {
        publishedAt: true,
        sentimentScore: true,
      },
      orderBy: {
        publishedAt: 'asc',
      },
    });

    return rows.map((row) => ({
      publishedAt: row.publishedAt.getTime(),
      sentimentScore: row.sentimentScore ?? 0,
    }));
  }
}
