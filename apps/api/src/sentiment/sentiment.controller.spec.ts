import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NewsItem } from '@csl/contracts';
import { SentimentController } from './sentiment.controller';
import { SentimentService } from './sentiment.service';
import { sentimentProviderFactory } from './sentiment.module';
import { GroqSentimentProvider } from './providers/groq-sentiment.provider';
import { HeuristicSentimentProvider } from './providers/heuristic-sentiment.provider';

describe('SentimentController', () => {
  let controller: SentimentController;
  let mockSentimentService: {
    analyzeArticle: jest.Mock;
    analyzeBatch: jest.Mock;
    getStats: jest.Mock;
  };

  const sampleAnalyzedNews: NewsItem = {
    id: 'news-1',
    title: 'Bitcoin surges past 100k',
    content: 'Bitcoin has hit an all-time high of 100k.',
    source: 'CryptoCompare',
    publishedAt: 1755770400000,
    crawledAt: 1755770400000,
    relatedCoins: ['BTC'],
    url: 'https://example.com/btc',
    sentiment: {
      label: 'POSITIVE',
      score: 0.85,
    },
  };

  beforeEach(() => {
    mockSentimentService = {
      analyzeArticle: jest.fn(),
      analyzeBatch: jest.fn(),
      getStats: jest.fn(),
    };

    controller = new SentimentController(mockSentimentService as unknown as SentimentService);
  });

  describe('POST /sentiment/analyze/:id (analyzeArticle)', () => {
    it('analyzes and returns the news item when found', async () => {
      mockSentimentService.analyzeArticle.mockResolvedValue(sampleAnalyzedNews);

      const result = await controller.analyzeArticle('news-1');

      expect(mockSentimentService.analyzeArticle).toHaveBeenCalledWith('news-1');
      expect(result).toEqual(sampleAnalyzedNews);
    });

    it('throws BadRequestException if id is missing or empty string', async () => {
      await expect(controller.analyzeArticle('')).rejects.toThrow(BadRequestException);
      await expect(controller.analyzeArticle('   ')).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException when article is not found or already analyzed', async () => {
      mockSentimentService.analyzeArticle.mockResolvedValue(null);

      await expect(controller.analyzeArticle('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockSentimentService.analyzeArticle).toHaveBeenCalledWith('missing-id');
    });
  });

  describe('POST /sentiment/batch (analyzeBatch)', () => {
    it('triggers batch analysis with limit and returns results', async () => {
      const mockResult = { processed: 10, updated: 8 };
      mockSentimentService.analyzeBatch.mockResolvedValue(mockResult);

      const result = await controller.analyzeBatch({ limit: 10 });

      expect(mockSentimentService.analyzeBatch).toHaveBeenCalledWith(10);
      expect(result).toEqual(mockResult);
    });

    it('handles undefined body / empty payload', async () => {
      const mockResult = { processed: 5, updated: 5 };
      mockSentimentService.analyzeBatch.mockResolvedValue(mockResult);

      const result = await controller.analyzeBatch(undefined);

      expect(mockSentimentService.analyzeBatch).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it('handles body without limit', async () => {
      const mockResult = { processed: 5, updated: 5 };
      mockSentimentService.analyzeBatch.mockResolvedValue(mockResult);

      const result = await controller.analyzeBatch({});

      expect(mockSentimentService.analyzeBatch).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockResult);
    });

    it('throws BadRequestException if limit is not a positive integer', async () => {
      await expect(controller.analyzeBatch({ limit: 0 })).rejects.toThrow(BadRequestException);
      await expect(controller.analyzeBatch({ limit: -5 })).rejects.toThrow(BadRequestException);
      await expect(controller.analyzeBatch({ limit: 3.14 })).rejects.toThrow(BadRequestException);
      await expect(controller.analyzeBatch({ limit: '10' as unknown as number })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('GET /sentiment/stats (getStats)', () => {
    const mockStats = {
      total: 100,
      positive: 60,
      neutral: 25,
      negative: 15,
      averageScore: 0.45,
    };

    it('returns sentiment statistics for all coins when coin is undefined', async () => {
      mockSentimentService.getStats.mockResolvedValue(mockStats);

      const result = await controller.getStats(undefined);

      expect(mockSentimentService.getStats).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(mockStats);
    });

    it('returns sentiment statistics filtered by coin when coin is provided', async () => {
      mockSentimentService.getStats.mockResolvedValue({
        total: 50,
        positive: 35,
        neutral: 10,
        negative: 5,
        averageScore: 0.6,
      });

      const result = await controller.getStats('BTC');

      expect(mockSentimentService.getStats).toHaveBeenCalledWith('BTC');
      expect(result).toEqual({
        total: 50,
        positive: 35,
        neutral: 10,
        negative: 5,
        averageScore: 0.6,
      });
    });

    it('trims coin parameter and handles whitespace-only coin as undefined', async () => {
      mockSentimentService.getStats.mockResolvedValue(mockStats);

      await controller.getStats('  ETH  ');
      expect(mockSentimentService.getStats).toHaveBeenCalledWith('ETH');

      await controller.getStats('   ');
      expect(mockSentimentService.getStats).toHaveBeenCalledWith(undefined);
    });
  });

  describe('sentimentProviderFactory', () => {
    const mockGroq = new GroqSentimentProvider();
    const mockHeuristic = new HeuristicSentimentProvider();

    it('returns GroqSentimentProvider when GROQ_API_KEY is configured in ConfigService', () => {
      const mockConfig = {
        get: jest.fn().mockReturnValue('gsk-test-key-123'),
      } as unknown as ConfigService;

      const provider = sentimentProviderFactory(mockConfig, mockGroq, mockHeuristic);
      expect(provider).toBe(mockGroq);
    });

    it('returns GroqSentimentProvider when GROQ_API_KEY is present in process.env', () => {
      const originalKey = process.env.GROQ_API_KEY;
      process.env.GROQ_API_KEY = 'env-api-key';
      try {
        const mockConfig = {
          get: jest.fn().mockReturnValue(undefined),
        } as unknown as ConfigService;

        const provider = sentimentProviderFactory(mockConfig, mockGroq, mockHeuristic);
        expect(provider).toBe(mockGroq);
      } finally {
        if (originalKey !== undefined) {
          process.env.GROQ_API_KEY = originalKey;
        } else {
          delete process.env.GROQ_API_KEY;
        }
      }
    });

    it('returns HeuristicSentimentProvider when GROQ_API_KEY is missing from both ConfigService and process.env', () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;
      try {
        const mockConfig = {
          get: jest.fn().mockReturnValue(undefined),
        } as unknown as ConfigService;

        const provider = sentimentProviderFactory(mockConfig, mockGroq, mockHeuristic);
        expect(provider).toBe(mockHeuristic);
      } finally {
        if (originalKey !== undefined) {
          process.env.GROQ_API_KEY = originalKey;
        }
      }
    });

    it('returns HeuristicSentimentProvider when ConfigService is undefined and process.env is empty', () => {
      const originalKey = process.env.GROQ_API_KEY;
      delete process.env.GROQ_API_KEY;
      try {
        const provider = sentimentProviderFactory(undefined, mockGroq, mockHeuristic);
        expect(provider).toBe(mockHeuristic);
      } finally {
        if (originalKey !== undefined) {
          process.env.GROQ_API_KEY = originalKey;
        }
      }
    });
  });
});
