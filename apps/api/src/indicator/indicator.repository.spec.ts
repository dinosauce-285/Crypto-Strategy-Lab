import { PrismaService } from '../prisma/prisma.service';
import { IndicatorRepository } from './indicator.repository';

describe('IndicatorRepository', () => {
  let repository: IndicatorRepository;
  let mockPrisma: {
    news: {
      findMany: jest.Mock;
    };
  };

  const sampleDate1 = new Date('2026-08-20T10:00:00.000Z');
  const sampleDate2 = new Date('2026-08-20T12:00:00.000Z');

  beforeEach(() => {
    mockPrisma = {
      news: {
        findMany: jest.fn(),
      },
    };

    repository = new IndicatorRepository(mockPrisma as unknown as PrismaService);
  });

  it('fetches only scored articles ordered by publishedAt asc', async () => {
    mockPrisma.news.findMany.mockResolvedValue([
      { publishedAt: sampleDate1, sentimentScore: 0.8 },
      { publishedAt: sampleDate2, sentimentScore: -0.5 },
    ]);

    const result = await repository.findScoredArticles();

    expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
      where: { sentimentScore: { not: null } },
      select: { publishedAt: true, sentimentScore: true },
      orderBy: { publishedAt: 'asc' },
    });

    expect(result).toEqual([
      { publishedAt: sampleDate1.getTime(), sentimentScore: 0.8 },
      { publishedAt: sampleDate2.getTime(), sentimentScore: -0.5 },
    ]);
  });

  it('handles null sentimentScore by defaulting to 0', async () => {
    mockPrisma.news.findMany.mockResolvedValue([
      { publishedAt: sampleDate1, sentimentScore: null },
    ]);

    const result = await repository.findScoredArticles();

    expect(result).toEqual([
      { publishedAt: sampleDate1.getTime(), sentimentScore: 0 },
    ]);
  });
});
