import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS, type NewsItem, type Sentiment } from '@csl/contracts';
import { SentimentRepository } from './sentiment.repository';
import { SentimentProviderPort } from './ports/sentiment-provider.port';
import { SentimentService } from './sentiment.service';

class MockSentimentProvider extends SentimentProviderPort {
  readonly name = 'MockSentimentProvider';
  analyzeMock: jest.Mock = jest.fn();

  async analyze(text: string): Promise<Sentiment> {
    return this.analyzeMock(text);
  }
}

describe('SentimentService', () => {
  let service: SentimentService;
  let mockRepository: {
    findUnscored: jest.Mock;
    updateSentiment: jest.Mock;
    updateSentimentBatch: jest.Mock;
    getSentimentStats: jest.Mock;
  };
  let mockEventEmitter: {
    emit: jest.Mock;
  };
  let mockProvider: MockSentimentProvider;

  const sampleDate = 1755770400000;

  const sampleUnscoredItem1: NewsItem = {
    id: 'news-1',
    title: 'Bitcoin Surges to New High',
    content: 'Massive bullish rally across crypto markets.',
    source: 'CryptoCompare',
    url: 'https://example.com/news/1',
    publishedAt: sampleDate,
    crawledAt: sampleDate,
    relatedCoins: ['BTC'],
  };

  const sampleUnscoredItem2: NewsItem = {
    id: 'news-2',
    title: 'Ethereum Upgrade Completed',
    content: 'Network fees drop following successful hard fork.',
    source: 'CoinDesk',
    url: 'https://example.com/news/2',
    publishedAt: sampleDate + 1000,
    crawledAt: sampleDate + 1000,
    relatedCoins: ['ETH'],
  };

  const sampleSentimentPositive: Sentiment = {
    label: 'POSITIVE',
    score: 0.85,
  };

  const sampleSentimentNeutral: Sentiment = {
    label: 'NEUTRAL',
    score: 0.0,
  };

  beforeEach(() => {
    mockRepository = {
      findUnscored: jest.fn(),
      updateSentiment: jest.fn(),
      updateSentimentBatch: jest.fn(),
      getSentimentStats: jest.fn(),
    };

    mockEventEmitter = {
      emit: jest.fn(),
    };

    mockProvider = new MockSentimentProvider();

    service = new SentimentService(
      mockRepository as unknown as SentimentRepository,
      mockEventEmitter as unknown as EventEmitter2,
      mockProvider,
    );
  });

  describe('onNewsCollected', () => {
    it('fetches unscored news by newsIds, classifies each with provider, updates repository, and emits SentimentAnalyzed', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1, sampleUnscoredItem2]);
      mockProvider.analyzeMock
        .mockResolvedValueOnce(sampleSentimentPositive)
        .mockResolvedValueOnce(sampleSentimentNeutral);
      mockRepository.updateSentiment
        .mockResolvedValueOnce({ ...sampleUnscoredItem1, sentiment: sampleSentimentPositive })
        .mockResolvedValueOnce({ ...sampleUnscoredItem2, sentiment: sampleSentimentNeutral });

      await service.onNewsCollected({
        newsIds: ['news-1', 'news-2'],
        source: 'CryptoCompare',
      });

      expect(mockRepository.findUnscored).toHaveBeenCalledWith(undefined, ['news-1', 'news-2']);
      expect(mockProvider.analyzeMock).toHaveBeenCalledWith(
        'Bitcoin Surges to New High\n\nMassive bullish rally across crypto markets.',
      );
      expect(mockProvider.analyzeMock).toHaveBeenCalledWith(
        'Ethereum Upgrade Completed\n\nNetwork fees drop following successful hard fork.',
      );
      expect(mockRepository.updateSentiment).toHaveBeenCalledWith('news-1', sampleSentimentPositive);
      expect(mockRepository.updateSentiment).toHaveBeenCalledWith('news-2', sampleSentimentNeutral);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-1',
        sentiment: sampleSentimentPositive,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-2',
        sentiment: sampleSentimentNeutral,
      });
    });

    it('handles empty or missing newsIds without calling repository or provider', async () => {
      await service.onNewsCollected({ newsIds: [], source: 'test' });
      await service.onNewsCollected(undefined as unknown as { newsIds: string[]; source: string });

      expect(mockRepository.findUnscored).not.toHaveBeenCalled();
      expect(mockProvider.analyzeMock).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('handles empty unscored news result from repository gracefully', async () => {
      mockRepository.findUnscored.mockResolvedValue([]);

      await service.onNewsCollected({ newsIds: ['news-99'], source: 'test' });

      expect(mockRepository.findUnscored).toHaveBeenCalledWith(undefined, ['news-99']);
      expect(mockProvider.analyzeMock).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });

    it('is fault-tolerant: continues processing remaining news items when provider fails for one', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1, sampleUnscoredItem2]);
      mockProvider.analyzeMock
        .mockRejectedValueOnce(new Error('Groq rate limit exceeded'))
        .mockResolvedValueOnce(sampleSentimentNeutral);
      mockRepository.updateSentiment.mockResolvedValueOnce({
        ...sampleUnscoredItem2,
        sentiment: sampleSentimentNeutral,
      });

      await service.onNewsCollected({
        newsIds: ['news-1', 'news-2'],
        source: 'CryptoCompare',
      });

      expect(mockRepository.updateSentiment).not.toHaveBeenCalledWith('news-1', expect.anything());
      expect(mockRepository.updateSentiment).toHaveBeenCalledWith('news-2', sampleSentimentNeutral);
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        EVENTS.SentimentAnalyzed,
        expect.objectContaining({ newsId: 'news-1' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-2',
        sentiment: sampleSentimentNeutral,
      });
    });

    it('falls back to title only when content is empty or undefined', async () => {
      const itemWithoutContent: NewsItem = {
        ...sampleUnscoredItem1,
        content: '',
      };
      mockRepository.findUnscored.mockResolvedValue([itemWithoutContent]);
      mockProvider.analyzeMock.mockResolvedValue(sampleSentimentPositive);
      mockRepository.updateSentiment.mockResolvedValue({
        ...itemWithoutContent,
        sentiment: sampleSentimentPositive,
      });

      await service.onNewsCollected({
        newsIds: ['news-1'],
        source: 'CryptoCompare',
      });

      expect(mockProvider.analyzeMock).toHaveBeenCalledWith('Bitcoin Surges to New High');
    });
  });

  describe('analyzeArticle', () => {
    it('analyzes a single unscored article, updates repository, emits event and returns updated item', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1]);
      mockProvider.analyzeMock.mockResolvedValue(sampleSentimentPositive);
      const updatedItem: NewsItem = {
        ...sampleUnscoredItem1,
        sentiment: sampleSentimentPositive,
      };
      mockRepository.updateSentiment.mockResolvedValue(updatedItem);

      const result = await service.analyzeArticle('news-1');

      expect(mockRepository.findUnscored).toHaveBeenCalledWith(1, ['news-1']);
      expect(mockProvider.analyzeMock).toHaveBeenCalledWith(
        'Bitcoin Surges to New High\n\nMassive bullish rally across crypto markets.',
      );
      expect(mockRepository.updateSentiment).toHaveBeenCalledWith('news-1', sampleSentimentPositive);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-1',
        sentiment: sampleSentimentPositive,
      });
      expect(result).toEqual(updatedItem);
    });

    it('returns null when article is not found in unscored items', async () => {
      mockRepository.findUnscored.mockResolvedValue([]);

      const result = await service.analyzeArticle('non-existent');

      expect(mockRepository.findUnscored).toHaveBeenCalledWith(1, ['non-existent']);
      expect(mockProvider.analyzeMock).not.toHaveBeenCalled();
      expect(mockRepository.updateSentiment).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('returns null when repository update returns null', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1]);
      mockProvider.analyzeMock.mockResolvedValue(sampleSentimentPositive);
      mockRepository.updateSentiment.mockResolvedValue(null);

      const result = await service.analyzeArticle('news-1');

      expect(mockRepository.updateSentiment).toHaveBeenCalledWith('news-1', sampleSentimentPositive);
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('rethrows error when provider fails during analyzeArticle', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1]);
      mockProvider.analyzeMock.mockRejectedValue(new Error('API key invalid'));

      await expect(service.analyzeArticle('news-1')).rejects.toThrow('API key invalid');
      expect(mockRepository.updateSentiment).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
    });
  });

  describe('analyzeBatch', () => {
    it('fetches unscored items up to limit, classifies, updates batch in repository and emits events', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1, sampleUnscoredItem2]);
      mockProvider.analyzeMock
        .mockResolvedValueOnce(sampleSentimentPositive)
        .mockResolvedValueOnce(sampleSentimentNeutral);
      mockRepository.updateSentimentBatch.mockResolvedValue(2);

      const result = await service.analyzeBatch(10);

      expect(mockRepository.findUnscored).toHaveBeenCalledWith(10);
      expect(mockProvider.analyzeMock).toHaveBeenCalledTimes(2);
      expect(mockRepository.updateSentimentBatch).toHaveBeenCalledWith([
        { id: 'news-1', sentiment: sampleSentimentPositive },
        { id: 'news-2', sentiment: sampleSentimentNeutral },
      ]);
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-1',
        sentiment: sampleSentimentPositive,
      });
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-2',
        sentiment: sampleSentimentNeutral,
      });
      expect(result).toEqual({
        processed: 2,
        updated: 2,
        failed: 0,
      });
    });

    it('returns zero counts when no unscored articles are found', async () => {
      mockRepository.findUnscored.mockResolvedValue([]);

      const result = await service.analyzeBatch();

      expect(mockRepository.findUnscored).toHaveBeenCalledWith(undefined);
      expect(mockProvider.analyzeMock).not.toHaveBeenCalled();
      expect(mockRepository.updateSentimentBatch).not.toHaveBeenCalled();
      expect(mockEventEmitter.emit).not.toHaveBeenCalled();
      expect(result).toEqual({
        processed: 0,
        updated: 0,
        failed: 0,
      });
    });

    it('handles partial provider failure gracefully during batch analysis', async () => {
      mockRepository.findUnscored.mockResolvedValue([sampleUnscoredItem1, sampleUnscoredItem2]);
      mockProvider.analyzeMock
        .mockRejectedValueOnce(new Error('Groq model timeout'))
        .mockResolvedValueOnce(sampleSentimentNeutral);
      mockRepository.updateSentimentBatch.mockResolvedValue(1);

      const result = await service.analyzeBatch(5);

      expect(mockRepository.updateSentimentBatch).toHaveBeenCalledWith([
        { id: 'news-2', sentiment: sampleSentimentNeutral },
      ]);
      expect(mockEventEmitter.emit).not.toHaveBeenCalledWith(
        EVENTS.SentimentAnalyzed,
        expect.objectContaining({ newsId: 'news-1' }),
      );
      expect(mockEventEmitter.emit).toHaveBeenCalledWith(EVENTS.SentimentAnalyzed, {
        newsId: 'news-2',
        sentiment: sampleSentimentNeutral,
      });
      expect(result).toEqual({
        processed: 2,
        updated: 1,
        failed: 1,
        errors: [{ id: 'news-1', error: 'Groq model timeout' }],
      });
    });
  });

  describe('getStats', () => {
    it('delegates to repository getSentimentStats without coin parameter', async () => {
      const stats = {
        total: 10,
        positive: 6,
        neutral: 3,
        negative: 1,
        averageScore: 0.52,
      };
      mockRepository.getSentimentStats.mockResolvedValue(stats);

      const result = await service.getStats();

      expect(mockRepository.getSentimentStats).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(stats);
    });

    it('delegates to repository getSentimentStats with coin parameter', async () => {
      const stats = {
        total: 5,
        positive: 4,
        neutral: 1,
        negative: 0,
        averageScore: 0.68,
      };
      mockRepository.getSentimentStats.mockResolvedValue(stats);

      const result = await service.getStats('BTC');

      expect(mockRepository.getSentimentStats).toHaveBeenCalledWith('BTC');
      expect(result).toEqual(stats);
    });
  });
});
