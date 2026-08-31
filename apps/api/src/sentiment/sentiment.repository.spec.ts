import type { NewsItem, Sentiment } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SentimentRepository, fromRow, toRow } from './sentiment.repository';

describe('SentimentRepository', () => {
  let repository: SentimentRepository;
  let mockPrisma: {
    news: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      groupBy: jest.Mock;
      aggregate: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const sampleDate = new Date('2026-08-21T10:00:00.000Z');
  const sampleTimestamp = sampleDate.getTime();

  const mockDbRow = {
    id: 'news-1',
    title: 'Bitcoin Surges Past 100k',
    content: 'Bitcoin reached a new all time high today.',
    source: 'CryptoCompare',
    url: 'https://example.com/news/1',
    publishedAt: sampleDate,
    crawledAt: sampleDate,
    relatedCoins: ['BTC', 'ETH'],
    sentimentLabel: 'POSITIVE',
    sentimentScore: 0.85,
  };

  const mockUnscoredDbRow = {
    id: 'news-2',
    title: 'Market Analysis Today',
    content: 'General market overview for crypto assets.',
    source: 'CoinDesk',
    url: 'https://example.com/news/2',
    publishedAt: sampleDate,
    crawledAt: sampleDate,
    relatedCoins: ['SOL'],
    sentimentLabel: null,
    sentimentScore: null,
  };

  const sampleNewsItem: NewsItem = {
    id: 'news-1',
    title: 'Bitcoin Surges Past 100k',
    content: 'Bitcoin reached a new all time high today.',
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
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    repository = new SentimentRepository(mockPrisma as unknown as PrismaService);
  });

  describe('mapping helpers', () => {
    it('toRow maps NewsItem with sentiment to Prisma payload', () => {
      const row = toRow(sampleNewsItem);

      expect(row.title).toBe(sampleNewsItem.title);
      expect(row.content).toBe(sampleNewsItem.content);
      expect(row.source).toBe(sampleNewsItem.source);
      expect(row.url).toBe(sampleNewsItem.url);
      expect(row.publishedAt).toEqual(new Date(sampleTimestamp));
      expect(row.crawledAt).toEqual(new Date(sampleTimestamp));
      expect(row.relatedCoins).toEqual(['BTC', 'ETH']);
      expect(row.sentimentLabel).toBe('POSITIVE');
      expect(row.sentimentScore).toBe(0.85);
    });

    it('toRow maps NewsItem without sentiment with null sentiment fields', () => {
      const unscoredItem: NewsItem = {
        ...sampleNewsItem,
        sentiment: undefined,
      };

      const row = toRow(unscoredItem);
      expect(row.sentimentLabel).toBeNull();
      expect(row.sentimentScore).toBeNull();
    });

    it('toRow defaults crawledAt to Date when omitted', () => {
      const itemWithoutCrawledAt: Omit<NewsItem, 'id' | 'crawledAt'> = {
        title: sampleNewsItem.title,
        content: sampleNewsItem.content,
        source: sampleNewsItem.source,
        url: sampleNewsItem.url,
        publishedAt: sampleTimestamp,
        relatedCoins: ['BTC'],
      };

      const row = toRow(itemWithoutCrawledAt as NewsItem);
      expect(row.crawledAt).toBeInstanceOf(Date);
    });

    it('fromRow maps database row with sentiment to NewsItem domain object', () => {
      const item = fromRow(mockDbRow);

      expect(item).toEqual({
        id: 'news-1',
        title: 'Bitcoin Surges Past 100k',
        content: 'Bitcoin reached a new all time high today.',
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

    it('fromRow omits sentiment when sentiment fields are null in database row', () => {
      const item = fromRow(mockUnscoredDbRow);

      expect(item).toEqual({
        id: 'news-2',
        title: 'Market Analysis Today',
        content: 'General market overview for crypto assets.',
        source: 'CoinDesk',
        url: 'https://example.com/news/2',
        publishedAt: sampleTimestamp,
        crawledAt: sampleTimestamp,
        relatedCoins: ['SOL'],
      });
      expect(item.sentiment).toBeUndefined();
    });

    it('fromRow omits sentiment when only one sentiment field is null', () => {
      const partialRow = {
        ...mockDbRow,
        sentimentLabel: 'POSITIVE',
        sentimentScore: null,
      };

      const item = fromRow(partialRow);
      expect(item.sentiment).toBeUndefined();
    });
  });

  describe('findById', () => {
    it('returns NewsItem when article is found by id', async () => {
      mockPrisma.news.findUnique.mockResolvedValue(mockDbRow);

      const result = await repository.findById('news-1');

      expect(mockPrisma.news.findUnique).toHaveBeenCalledWith({
        where: { id: 'news-1' },
      });
      expect(result).toEqual(sampleNewsItem);
    });

    it('returns null when article is not found', async () => {
      mockPrisma.news.findUnique.mockResolvedValue(null);

      const result = await repository.findById('non-existent');

      expect(mockPrisma.news.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findUnscored', () => {
    it('returns empty array without querying Prisma when ids is an empty array', async () => {
      const result = await repository.findUnscored(10, []);

      expect(result).toEqual([]);
      expect(mockPrisma.news.findMany).not.toHaveBeenCalled();
    });

    it('finds unscored news with default ordering by publishedAt desc', async () => {
      mockPrisma.news.findMany.mockResolvedValue([mockUnscoredDbRow]);

      const result = await repository.findUnscored();

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: { sentimentLabel: null },
        orderBy: { publishedAt: 'desc' },
        take: undefined,
      });
      expect(result).toEqual([fromRow(mockUnscoredDbRow)]);
    });

    it('applies limit to findUnscored query', async () => {
      mockPrisma.news.findMany.mockResolvedValue([mockUnscoredDbRow]);

      const result = await repository.findUnscored(5);

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: { sentimentLabel: null },
        orderBy: { publishedAt: 'desc' },
        take: 5,
      });
      expect(result).toHaveLength(1);
    });

    it('filters by ids when ids array is provided', async () => {
      mockPrisma.news.findMany.mockResolvedValue([mockUnscoredDbRow]);

      const result = await repository.findUnscored(10, ['news-2', 'news-3']);

      expect(mockPrisma.news.findMany).toHaveBeenCalledWith({
        where: {
          sentimentLabel: null,
          id: { in: ['news-2', 'news-3'] },
        },
        orderBy: { publishedAt: 'desc' },
        take: 10,
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('updateSentiment', () => {
    const newSentiment: Sentiment = {
      label: 'POSITIVE',
      score: 0.9,
    };

    it('updates news sentiment and returns the mapped NewsItem', async () => {
      const updatedRow = {
        ...mockDbRow,
        sentimentLabel: 'POSITIVE',
        sentimentScore: 0.9,
      };
      mockPrisma.news.update.mockResolvedValue(updatedRow);

      const result = await repository.updateSentiment('news-1', newSentiment);

      expect(mockPrisma.news.update).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          sentimentLabel: 'POSITIVE',
          sentimentScore: 0.9,
        },
      });
      expect(result).toEqual(fromRow(updatedRow));
    });

    it('returns null when record is not found (P2025 error)', async () => {
      const p2025Error = new Prisma.PrismaClientKnownRequestError(
        'An operation failed because it depends on one or more records that were required but not found.',
        {
          code: 'P2025',
          clientVersion: '7.9.1',
        },
      );
      mockPrisma.news.update.mockRejectedValue(p2025Error);

      const result = await repository.updateSentiment('non-existent', newSentiment);

      expect(result).toBeNull();
    });

    it('returns null when mock error object has code P2025', async () => {
      const customError = { code: 'P2025', message: 'Record not found' };
      mockPrisma.news.update.mockRejectedValue(customError);

      const result = await repository.updateSentiment('non-existent', newSentiment);

      expect(result).toBeNull();
    });

    it('rethrows any other Prisma error', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.news.update.mockRejectedValue(dbError);

      await expect(repository.updateSentiment('news-1', newSentiment)).rejects.toThrow(
        'Database connection failed',
      );
    });
  });

  describe('updateSentimentBatch', () => {
    it('returns 0 without calling transaction when updates array is empty', async () => {
      const result = await repository.updateSentimentBatch([]);

      expect(result).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('executes batch updates in a transaction and returns count of updated items', async () => {
      const updates = [
        { id: 'news-1', sentiment: { label: 'POSITIVE' as const, score: 0.8 } },
        { id: 'news-2', sentiment: { label: 'NEGATIVE' as const, score: -0.6 } },
      ];

      mockPrisma.$transaction.mockResolvedValue([mockDbRow, mockDbRow]);

      const result = await repository.updateSentimentBatch(updates);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.news.update).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          sentimentLabel: 'POSITIVE',
          sentimentScore: 0.8,
        },
      });
      expect(mockPrisma.news.update).toHaveBeenCalledWith({
        where: { id: 'news-2' },
        data: {
          sentimentLabel: 'NEGATIVE',
          sentimentScore: -0.6,
        },
      });
      expect(result).toBe(2);
    });
  });

  describe('getSentimentStats', () => {
    it('computes stats across all coins when coin parameter is omitted', async () => {
      const mockGroups = [
        { sentimentLabel: 'POSITIVE', _count: { _all: 5 } },
        { sentimentLabel: 'NEUTRAL', _count: { _all: 3 } },
        { sentimentLabel: 'NEGATIVE', _count: { _all: 2 } },
      ];
      const mockAggregate = {
        _count: { _all: 10 },
        _avg: { sentimentScore: 0.45 },
      };

      mockPrisma.$transaction.mockResolvedValue([mockGroups, mockAggregate]);

      const stats = await repository.getSentimentStats();

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.news.groupBy).toHaveBeenCalledWith({
        by: ['sentimentLabel'],
        where: { sentimentLabel: { not: null } },
        _count: { _all: true },
        orderBy: { sentimentLabel: 'asc' },
      });
      expect(mockPrisma.news.aggregate).toHaveBeenCalledWith({
        where: { sentimentLabel: { not: null } },
        _count: { _all: true },
        _avg: { sentimentScore: true },
      });

      expect(stats).toEqual({
        total: 10,
        positive: 5,
        neutral: 3,
        negative: 2,
        averageScore: 0.45,
      });
    });

    it('filters stats by uppercase coin symbol when coin parameter is provided', async () => {
      const mockGroups = [
        { sentimentLabel: 'POSITIVE', _count: { _all: 4 } },
        { sentimentLabel: 'NEGATIVE', _count: { _all: 1 } },
      ];
      const mockAggregate = {
        _count: { _all: 5 },
        _avg: { sentimentScore: 0.6 },
      };

      mockPrisma.$transaction.mockResolvedValue([mockGroups, mockAggregate]);

      const stats = await repository.getSentimentStats('btc');

      expect(mockPrisma.news.groupBy).toHaveBeenCalledWith({
        by: ['sentimentLabel'],
        where: {
          sentimentLabel: { not: null },
          relatedCoins: { has: 'BTC' },
        },
        _count: { _all: true },
        orderBy: { sentimentLabel: 'asc' },
      });
      expect(mockPrisma.news.aggregate).toHaveBeenCalledWith({
        where: {
          sentimentLabel: { not: null },
          relatedCoins: { has: 'BTC' },
        },
        _count: { _all: true },
        _avg: { sentimentScore: true },
      });

      expect(stats).toEqual({
        total: 5,
        positive: 4,
        neutral: 0,
        negative: 1,
        averageScore: 0.6,
      });
    });

    it('returns zero values when no scored news items exist', async () => {
      const mockGroups: { sentimentLabel: string; _count: { _all: number } }[] = [];
      const mockAggregate = {
        _count: { _all: 0 },
        _avg: { sentimentScore: null },
      };

      mockPrisma.$transaction.mockResolvedValue([mockGroups, mockAggregate]);

      const stats = await repository.getSentimentStats();

      expect(stats).toEqual({
        total: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        averageScore: 0,
      });
    });
  });
});
