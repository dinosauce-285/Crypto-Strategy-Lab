import type { NewsItem } from '@csl/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { NewsRepository, fromRow, toRow } from './news.repository';

describe('NewsRepository', () => {
  let repository: NewsRepository;
  let mockPrisma: {
    news: {
      createManyAndReturn: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const sampleDate = new Date('2026-08-21T10:00:00.000Z');
  const sampleTimestamp = sampleDate.getTime();

  const mockDbRow = {
    id: 'news-1',
    title: 'Bitcoin Hits Record High',
    content: 'Bitcoin surged past resistance levels today.',
    source: 'CryptoCompare',
    url: 'https://example.com/news/1',
    publishedAt: sampleDate,
    crawledAt: sampleDate,
    relatedCoins: ['BTC', 'ETH'],
    sentimentLabel: 'POSITIVE',
    sentimentScore: 0.85,
  };

  const sampleNewsInput: Omit<NewsItem, 'id'> = {
    title: 'Bitcoin Hits Record High',
    content: 'Bitcoin surged past resistance levels today.',
    source: 'CryptoCompare',
    url: 'https://example.com/news/1',
    publishedAt: sampleTimestamp,
    crawledAt: sampleTimestamp,
    relatedCoins: ['BTC', 'ETH'],
    sentiment: {
      label: 'POSITIVE',
      score: 0.85,
    },
  };

  beforeEach(() => {
    mockPrisma = {
      news: {
        createManyAndReturn: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    repository = new NewsRepository(mockPrisma as unknown as PrismaService);
  });

  describe('mapping functions', () => {
    it('toRow converts NewsItem input to Prisma database row representation', () => {
      const row = toRow(sampleNewsInput);

      expect(row.title).toBe(sampleNewsInput.title);
      expect(row.content).toBe(sampleNewsInput.content);
      expect(row.source).toBe(sampleNewsInput.source);
      expect(row.url).toBe(sampleNewsInput.url);
      expect(row.publishedAt).toEqual(new Date(sampleTimestamp));
      expect(row.crawledAt).toEqual(new Date(sampleTimestamp));
      expect(row.relatedCoins).toEqual(['BTC', 'ETH']);
      expect(row.sentimentLabel).toBe('POSITIVE');
      expect(row.sentimentScore).toBe(0.85);
    });

    it('toRow handles item without sentiment', () => {
      const itemWithoutSentiment: Omit<NewsItem, 'id'> = {
        ...sampleNewsInput,
        sentiment: undefined,
      };

      const row = toRow(itemWithoutSentiment);
      expect(row.sentimentLabel).toBeNull();
      expect(row.sentimentScore).toBeNull();
    });

    it('fromRow converts Prisma database row to NewsItem contract', () => {
      const item = fromRow(mockDbRow);

      expect(item).toEqual({
        id: 'news-1',
        title: 'Bitcoin Hits Record High',
        content: 'Bitcoin surged past resistance levels today.',
        source: 'CryptoCompare',
        url: 'https://example.com/news/1',
        publishedAt: sampleTimestamp,
        crawledAt: sampleTimestamp,
        relatedCoins: ['BTC', 'ETH'],
        sentiment: {
          label: 'POSITIVE',
          score: 0.85,
        },
      });
    });

    it('fromRow omits sentiment when sentimentLabel or sentimentScore is null', () => {
      const rowWithoutSentiment = {
        ...mockDbRow,
        sentimentLabel: null,
        sentimentScore: null,
      };

      const item = fromRow(rowWithoutSentiment);
      expect(item.sentiment).toBeUndefined();
      expect(item.id).toBe('news-1');
      expect(item.url).toBe(mockDbRow.url);
    });
  });

  describe('upsertMany', () => {
    it('returns empty insertedIds when items array is empty without calling Prisma', async () => {
      const result = await repository.upsertMany([]);

      expect(result).toEqual({ insertedIds: [] });
      expect(mockPrisma.news.createManyAndReturn).not.toHaveBeenCalled();
    });

    it('deduplicates items in memory by url before calling createManyAndReturn', async () => {
      const duplicateItems: Omit<NewsItem, 'id'>[] = [
        sampleNewsInput,
        { ...sampleNewsInput, title: 'Duplicate URL Title' },
      ];

      mockPrisma.news.createManyAndReturn.mockResolvedValue([{ id: 'news-1' }]);

      const result = await repository.upsertMany(duplicateItems);

      expect(result).toEqual({ insertedIds: ['news-1'] });
      expect(mockPrisma.news.createManyAndReturn).toHaveBeenCalledTimes(1);
      expect(mockPrisma.news.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({
            url: sampleNewsInput.url,
            title: sampleNewsInput.title,
          }),
        ],
        skipDuplicates: true,
        select: { id: true },
      });
    });

    it('inserts multiple unique items and returns their inserted IDs', async () => {
      const item2: Omit<NewsItem, 'id'> = {
        title: 'Ethereum ETF Approval',
        content: 'SEC approves new spot ETH ETFs.',
        source: 'CoinDesk',
        url: 'https://example.com/news/2',
        publishedAt: sampleTimestamp + 1000,
        crawledAt: sampleTimestamp + 1000,
        relatedCoins: ['ETH'],
      };

      mockPrisma.news.createManyAndReturn.mockResolvedValue([
        { id: 'news-1' },
        { id: 'news-2' },
      ]);

      const result = await repository.upsertMany([sampleNewsInput, item2]);

      expect(result).toEqual({ insertedIds: ['news-1', 'news-2'] });
      expect(mockPrisma.news.createManyAndReturn).toHaveBeenCalledWith({
        data: [
          expect.objectContaining({ url: sampleNewsInput.url }),
          expect.objectContaining({ url: item2.url }),
        ],
        skipDuplicates: true,
        select: { id: true },
      });
    });

    it('returns empty array when all items already exist in database (skipped duplicates)', async () => {
      mockPrisma.news.createManyAndReturn.mockResolvedValue([]);

      const result = await repository.upsertMany([sampleNewsInput]);

      expect(result).toEqual({ insertedIds: [] });
    });
  });

  describe('findMany', () => {
    it('queries all news with default ordering and returns items with total', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 1]);

      const result = await repository.findMany({});

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { publishedAt: 'desc' },
        take: undefined,
        skip: undefined,
      });
      expect(mockPrisma.news.count).toHaveBeenCalledWith({
        where: {},
      });

      expect(result).toEqual({
        items: [fromRow(mockDbRow)],
        total: 1,
      });
    });

    it('filters by uppercase coin symbol', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 1]);

      await repository.findMany({ coin: 'btc' });

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            relatedCoins: { has: 'BTC' },
          },
        }),
      );
      expect(mockPrisma.news.count).toHaveBeenCalledWith({
        where: {
          relatedCoins: { has: 'BTC' },
        },
      });
    });

    it('filters by source', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 1]);

      await repository.findMany({ source: 'CryptoCompare' });

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            source: { contains: 'CryptoCompare', mode: 'insensitive' },
          },
        }),
      );
      expect(mockPrisma.news.count).toHaveBeenCalledWith({
        where: {
          source: { contains: 'CryptoCompare', mode: 'insensitive' },
        },
      });
    });

    it('filters by publishedAt date range (from & to)', async () => {
      const from = sampleTimestamp - 50000;
      const to = sampleTimestamp + 50000;

      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 1]);

      await repository.findMany({ from, to });

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            publishedAt: {
              gte: new Date(from),
              lte: new Date(to),
            },
          },
        }),
      );
      expect(mockPrisma.news.count).toHaveBeenCalledWith({
        where: {
          publishedAt: {
            gte: new Date(from),
            lte: new Date(to),
          },
        },
      });
    });

    it('filters by from date only', async () => {
      const from = sampleTimestamp;
      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 1]);

      await repository.findMany({ from });

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            publishedAt: {
              gte: new Date(from),
            },
          },
        }),
      );
    });

    it('filters by to date only', async () => {
      const to = sampleTimestamp;
      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 1]);

      await repository.findMany({ to });

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            publishedAt: {
              lte: new Date(to),
            },
          },
        }),
      );
    });

    it('applies pagination parameters limit and offset', async () => {
      mockPrisma.$transaction.mockResolvedValue([[mockDbRow], 25]);

      const result = await repository.findMany({ limit: 10, offset: 20 });

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        }),
      );
      expect(result.total).toBe(25);
    });
  });

  describe('findById', () => {
    it('returns mapped NewsItem when found', async () => {
      mockPrisma.news.findUnique.mockResolvedValue(mockDbRow);

      const result = await repository.findById('news-1');

      expect(mockPrisma.news.findUnique).toHaveBeenCalledWith({
        where: { id: 'news-1' },
      });
      expect(result).toEqual(fromRow(mockDbRow));
    });

    it('returns null when news item is not found', async () => {
      mockPrisma.news.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent-id');

      expect(mockPrisma.news.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-id' },
      });
      expect(result).toBeNull();
    });
  });
});
