import { NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS, type NewsItem } from '@csl/contracts';
import { NewsRepository, type FindManyNewsQuery } from './news.repository';
import { NewsProviderPort, type FetchNewsOptions } from './ports/news-provider.port';
import { NewsService } from './news.service';

class MockNewsProvider extends NewsProviderPort {
  constructor(
    public readonly name: string,
    public fetchNewsMock: jest.Mock = jest.fn(),
  ) {
    super();
  }

  async fetchNews(options?: FetchNewsOptions): Promise<Omit<NewsItem, 'id'>[]> {
    return this.fetchNewsMock(options);
  }
}

describe('NewsService', () => {
  let service: NewsService;
  let mockRepository: {
    upsertMany: jest.Mock;
    findMany: jest.Mock;
    findById: jest.Mock;
  };
  let mockEventEmitter: {
    emit: jest.Mock;
  };
  let provider1: MockNewsProvider;
  let provider2: MockNewsProvider;

  const sampleDate = 1755770400000;

  const article1: Omit<NewsItem, 'id'> = {
    title: 'Bitcoin Hits 100k',
    content: 'BTC reaches a milestone.',
    source: 'CryptoCompare',
    url: 'https://example.com/btc-100k',
    publishedAt: sampleDate,
    crawledAt: sampleDate,
    relatedCoins: ['BTC'],
  };

  const article2: Omit<NewsItem, 'id'> = {
    title: 'Ethereum Upgrade Live',
    content: 'ETH network upgrade complete.',
    source: 'CoinDesk',
    url: 'https://example.com/eth-upgrade',
    publishedAt: sampleDate + 1000,
    crawledAt: sampleDate + 1000,
    relatedCoins: ['ETH'],
  };

  beforeEach(() => {
    mockRepository = {
      upsertMany: jest.fn(),
      findMany: jest.fn(),
      findById: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    provider1 = new MockNewsProvider('CryptoCompare');
    provider2 = new MockNewsProvider('RSS');

    service = new NewsService(
      mockRepository as unknown as NewsRepository,
      mockEventEmitter as unknown as EventEmitter2,
      [provider1, provider2],
    );
  });

  describe('collect', () => {
    it('fetches news from all providers when no source is specified', async () => {
      provider1.fetchNewsMock.mockResolvedValue([article1]);
      provider2.fetchNewsMock.mockResolvedValue([article2]);
      mockRepository.upsertMany.mockResolvedValue({
        insertedIds: ['id-1', 'id-2'],
      });

      const result = await service.collect();

      expect(provider1.fetchNewsMock).toHaveBeenCalledWith(undefined);
      expect(provider2.fetchNewsMock).toHaveBeenCalledWith(undefined);
      expect(mockRepository.upsertMany).toHaveBeenCalledWith([article1, article2]);
      expect(result).toEqual({
        collected: 2,
        inserted: 2,
        newsIds: ['id-1', 'id-2'],
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.NewsCollected, {
        newsIds: ['id-1', 'id-2'],
        source: 'all',
      });
    });

    it('filters and calls only the matching provider when source option is provided (case-insensitive)', async () => {
      provider1.fetchNewsMock.mockResolvedValue([article1]);
      provider2.fetchNewsMock.mockResolvedValue([article2]);
      mockRepository.upsertMany.mockResolvedValue({
        insertedIds: ['id-1'],
      });

      const options = { source: 'cryptocompare', coins: ['BTC'] };
      const result = await service.collect(options);

      expect(provider1.fetchNewsMock).toHaveBeenCalledWith(options);
      expect(provider2.fetchNewsMock).not.toHaveBeenCalled();
      expect(mockRepository.upsertMany).toHaveBeenCalledWith([article1]);
      expect(result).toEqual({
        collected: 1,
        inserted: 1,
        newsIds: ['id-1'],
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.NewsCollected, {
        newsIds: ['id-1'],
        source: 'cryptocompare',
      });
    });

    it('throws NotFoundException when specified source does not match any provider', async () => {
      await expect(service.collect({ source: 'NonExistentSource' })).rejects.toThrow(
        NotFoundException,
      );

      expect(provider1.fetchNewsMock).not.toHaveBeenCalled();
      expect(provider2.fetchNewsMock).not.toHaveBeenCalled();
      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('is fault-tolerant: continues with remaining providers if one provider throws', async () => {
      provider1.fetchNewsMock.mockRejectedValue(new Error('CryptoCompare API Timeout'));
      provider2.fetchNewsMock.mockResolvedValue([article2]);
      mockRepository.upsertMany.mockResolvedValue({
        insertedIds: ['id-2'],
      });

      const result = await service.collect();

      expect(provider1.fetchNewsMock).toHaveBeenCalled();
      expect(provider2.fetchNewsMock).toHaveBeenCalled();
      expect(mockRepository.upsertMany).toHaveBeenCalledWith([article2]);
      expect(result).toEqual({
        collected: 1,
        inserted: 1,
        newsIds: ['id-2'],
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.NewsCollected, {
        newsIds: ['id-2'],
        source: 'all',
      });
    });

    it('does not emit EVENTS.NewsCollected when all articles are duplicates (0 inserted)', async () => {
      provider1.fetchNewsMock.mockResolvedValue([article1]);
      provider2.fetchNewsMock.mockResolvedValue([]);
      mockRepository.upsertMany.mockResolvedValue({
        insertedIds: [],
      });

      const result = await service.collect();

      expect(result).toEqual({
        collected: 1,
        inserted: 0,
        newsIds: [],
      });
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('handles zero articles collected across all providers without calling repository or emitting', async () => {
      provider1.fetchNewsMock.mockResolvedValue([]);
      provider2.fetchNewsMock.mockResolvedValue([]);

      const result = await service.collect();

      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(result).toEqual({
        collected: 0,
        inserted: 0,
        newsIds: [],
      });
    });

    it('handles empty provider list gracefully', async () => {
      const emptyService = new NewsService(
        mockRepository as unknown as NewsRepository,
        mockEventEmitter as unknown as EventEmitter2,
        [],
      );

      const result = await emptyService.collect();

      expect(result).toEqual({
        collected: 0,
        inserted: 0,
        newsIds: [],
      });
      expect(mockRepository.upsertMany).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('defaults providers to empty array when providers parameter is omitted', async () => {
      const defaultService = new NewsService(
        mockRepository as unknown as NewsRepository,
        mockEventEmitter as unknown as EventEmitter2,
      );

      const result = await defaultService.collect();

      expect(result).toEqual({
        collected: 0,
        inserted: 0,
        newsIds: [],
      });
    });
  });

  describe('getNews', () => {
    it('delegates to repository.findMany with query options', async () => {
      const query: FindManyNewsQuery = {
        coin: 'BTC',
        from: 1000,
        to: 2000,
        limit: 10,
        offset: 0,
      };

      const mockItems: NewsItem[] = [
        {
          id: 'id-1',
          ...article1,
        },
      ];

      mockRepository.findMany.mockResolvedValue({
        items: mockItems,
        total: 1,
      });

      const result = await service.getNews(query);

      expect(mockRepository.findMany).toHaveBeenCalledWith(query);
      expect(result).toEqual({
        items: mockItems,
        total: 1,
      });
    });
  });

  describe('getById', () => {
    it('delegates to repository.findById and returns the found NewsItem', async () => {
      const mockItem: NewsItem = {
        id: 'id-1',
        ...article1,
      };

      mockRepository.findById.mockResolvedValue(mockItem);

      const result = await service.getById('id-1');

      expect(mockRepository.findById).toHaveBeenCalledWith('id-1');
      expect(result).toEqual(mockItem);
    });

    it('returns null when repository.findById returns null', async () => {
      mockRepository.findById.mockResolvedValue(null);

      const result = await service.getById('missing-id');

      expect(mockRepository.findById).toHaveBeenCalledWith('missing-id');
      expect(result).toBeNull();
    });
  });
});
