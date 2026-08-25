import type { DataRequest } from '@csl/contracts';
import { IndicatorService } from './indicator.service';
import { movingAverageCalculator } from './calculators/moving-average.calculator';
import { bollingerBandsCalculator } from './calculators/bollinger-bands.calculator';
import { buildCandles } from './calculators/test-candles';
import type { IndicatorRepository } from './indicator.repository';

describe('IndicatorService', () => {
  const candles = buildCandles([1, 2, 3, 4, 5]);

  it('computes an indicator once and reuses it for a repeated request', () => {
    const service = new IndicatorService();
    const spy = jest.spyOn(movingAverageCalculator, 'compute');
    const request: DataRequest = { source: 'ma', params: { period: 3 } };

    const first = service.compute('dataset-1', candles, request);
    const second = service.compute('dataset-1', candles, request);

    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("shares one computed pass across a multi-series indicator's fields", () => {
    const service = new IndicatorService();
    const spy = jest.spyOn(bollingerBandsCalculator, 'compute');

    service.compute('dataset-1', candles, { source: 'bollinger.upper', params: { period: 3 } });
    service.compute('dataset-1', candles, { source: 'bollinger.middle', params: { period: 3 } });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('does not share a cache entry across different datasets', () => {
    const service = new IndicatorService();
    const spy = jest.spyOn(movingAverageCalculator, 'compute');
    const request: DataRequest = { source: 'ma', params: { period: 3 } };

    service.compute('dataset-1', candles, request);
    service.compute('dataset-2', candles, request);

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('throws for an unregistered indicator name', () => {
    const service = new IndicatorService();
    expect(() => service.compute('dataset-1', candles, { source: 'macd', params: {} })).toThrow();
  });

  it('throws for an unknown field of a registered indicator', () => {
    const service = new IndicatorService();
    expect(() =>
      service.compute('dataset-1', candles, { source: 'bollinger.nope', params: { period: 3 } }),
    ).toThrow();
  });

  it('loads scored articles from repository onModuleInit and computes sentiment series', async () => {
    const t0 = candles[0].openTime;
    const mockRepo: jest.Mocked<IndicatorRepository> = {
      findScoredArticles: jest.fn().mockResolvedValue([
        { publishedAt: t0, sentimentScore: 0.8 },
      ]),
    } as unknown as jest.Mocked<IndicatorRepository>;

    const service = new IndicatorService(mockRepo);
    await service.onModuleInit();

    expect(mockRepo.findScoredArticles).toHaveBeenCalledTimes(1);

    const result = service.compute('dataset-sentiment', candles, {
      source: 'sentiment',
      params: { windowHours: 1 },
    });

    expect(result[0]).toBe(0.8);
  });

  it('refreshes articles on sentiment analyzed event', async () => {
    const t0 = candles[0].openTime;
    const mockRepo: jest.Mocked<IndicatorRepository> = {
      findScoredArticles: jest.fn().mockResolvedValue([
        { publishedAt: t0, sentimentScore: 0.95 },
      ]),
    } as unknown as jest.Mocked<IndicatorRepository>;

    const service = new IndicatorService(mockRepo);
    await service.onSentimentAnalyzed();

    expect(mockRepo.findScoredArticles).toHaveBeenCalled();

    const result = service.compute('dataset-sentiment-2', candles, {
      source: 'sentiment',
      params: { windowHours: 1 },
    });

    expect(result[0]).toBe(0.95);
  });
});
