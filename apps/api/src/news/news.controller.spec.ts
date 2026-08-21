import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { NewsItem } from '@csl/contracts';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

describe('NewsController', () => {
  let controller: NewsController;
  let mockNewsService: {
    getNews: jest.Mock;
    getById: jest.Mock;
    collect: jest.Mock;
  };

  const sampleNewsItem: NewsItem = {
    id: 'news-123',
    title: 'Bitcoin breaks new high',
    content: 'Bitcoin surged past resistance levels.',
    source: 'CryptoCompare',
    publishedAt: 1755770400000,
    crawledAt: 1755770400000,
    relatedCoins: ['BTC'],
    url: 'https://example.com/btc-news',
  };

  beforeEach(() => {
    mockNewsService = {
      getNews: jest.fn(),
      getById: jest.fn(),
      collect: jest.fn(),
    };

    controller = new NewsController(mockNewsService as unknown as NewsService);
  });

  describe('GET /news (getNews)', () => {
    it('returns news list and total with parsed query parameters', async () => {
      mockNewsService.getNews.mockResolvedValue({
        items: [sampleNewsItem],
        total: 1,
      });

      const result = await controller.getNews('BTC', '1755700000000', '1755800000000', '10', '0');

      expect(mockNewsService.getNews).toHaveBeenCalledWith({
        coin: 'BTC',
        from: 1755700000000,
        to: 1755800000000,
        limit: 10,
        offset: 0,
      });
      expect(result).toEqual({
        items: [sampleNewsItem],
        total: 1,
      });
    });

    it('works with undefined / optional query parameters', async () => {
      mockNewsService.getNews.mockResolvedValue({
        items: [sampleNewsItem],
        total: 1,
      });

      const result = await controller.getNews(undefined, undefined, undefined, undefined, undefined);

      expect(mockNewsService.getNews).toHaveBeenCalledWith({
        coin: undefined,
        from: undefined,
        to: undefined,
        limit: undefined,
        offset: undefined,
      });
      expect(result).toEqual({
        items: [sampleNewsItem],
        total: 1,
      });
    });

    it('throws BadRequestException if from is not a valid non-negative integer', async () => {
      await expect(controller.getNews(undefined, 'invalid', undefined, undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getNews(undefined, '-100', undefined, undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if to is not a valid non-negative integer', async () => {
      await expect(controller.getNews(undefined, undefined, 'not-a-number', undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getNews(undefined, undefined, '-500', undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if from is after to', async () => {
      await expect(controller.getNews(undefined, '2000', '1000', undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if limit is not a positive integer', async () => {
      await expect(controller.getNews(undefined, undefined, undefined, '0', undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getNews(undefined, undefined, undefined, '-5', undefined)).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getNews(undefined, undefined, undefined, 'abc', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if offset is not a non-negative integer', async () => {
      await expect(controller.getNews(undefined, undefined, undefined, undefined, '-1')).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.getNews(undefined, undefined, undefined, undefined, 'xyz')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /news/:id (getById)', () => {
    it('returns the news article when found', async () => {
      mockNewsService.getById.mockResolvedValue(sampleNewsItem);

      const result = await controller.getById('news-123');

      expect(mockNewsService.getById).toHaveBeenCalledWith('news-123');
      expect(result).toEqual(sampleNewsItem);
    });

    it('throws NotFoundException when article does not exist', async () => {
      mockNewsService.getById.mockResolvedValue(null);

      await expect(controller.getById('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockNewsService.getById).toHaveBeenCalledWith('missing-id');
    });
  });

  describe('POST /news/collect (collect)', () => {
    it('triggers collection and returns the collection result', async () => {
      const mockResult = {
        collected: 5,
        inserted: 3,
        newsIds: ['id-1', 'id-2', 'id-3'],
      };
      mockNewsService.collect.mockResolvedValue(mockResult);

      const body = {
        source: 'cryptocompare',
        coins: ['BTC', 'ETH'],
        from: 1000,
        to: 2000,
        limit: 10,
      };

      const result = await controller.collect(body);

      expect(mockNewsService.collect).toHaveBeenCalledWith(body);
      expect(result).toEqual(mockResult);
    });

    it('handles empty body / undefined options gracefully', async () => {
      const mockResult = {
        collected: 0,
        inserted: 0,
        newsIds: [],
      };
      mockNewsService.collect.mockResolvedValue(mockResult);

      const result = await controller.collect(undefined);

      expect(mockNewsService.collect).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it('throws BadRequestException if body source is not a string', async () => {
      await expect(controller.collect({ source: 123 as unknown as string })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if body coins is not an array of strings', async () => {
      await expect(controller.collect({ coins: 'BTC' as unknown as string[] })).rejects.toThrow(
        BadRequestException,
      );
      await expect(controller.collect({ coins: [123] as unknown as string[] })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if body from is not a non-negative integer', async () => {
      await expect(controller.collect({ from: -10 })).rejects.toThrow(BadRequestException);
      await expect(controller.collect({ from: 10.5 })).rejects.toThrow(BadRequestException);
      await expect(controller.collect({ from: '100' as unknown as number })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if body to is not a non-negative integer', async () => {
      await expect(controller.collect({ to: -10 })).rejects.toThrow(BadRequestException);
      await expect(controller.collect({ to: 10.5 })).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if body from is after to', async () => {
      await expect(controller.collect({ from: 2000, to: 1000 })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if body limit is not a positive integer', async () => {
      await expect(controller.collect({ limit: 0 })).rejects.toThrow(BadRequestException);
      await expect(controller.collect({ limit: -5 })).rejects.toThrow(BadRequestException);
      await expect(controller.collect({ limit: 5.5 })).rejects.toThrow(BadRequestException);
    });
  });
});
