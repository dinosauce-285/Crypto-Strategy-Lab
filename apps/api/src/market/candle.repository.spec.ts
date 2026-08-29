import type { Candle } from '@csl/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { CandleRepository } from './candle.repository';

describe('CandleRepository', () => {
  let repository: CandleRepository;
  let mockPrisma: {
    candle: {
      upsert: jest.Mock;
      findMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const makeCandle = (openTime: number): Candle => ({
    pair: 'BTCUSDT',
    timeframe: '1m',
    openTime,
    open: '1',
    high: '1',
    low: '1',
    close: '1',
    volume: '1',
    closed: true,
  });

  beforeEach(() => {
    mockPrisma = {
      candle: {
        upsert: jest.fn((args) => args),
        findMany: jest.fn(),
      },
      $transaction: jest.fn().mockResolvedValue(undefined),
    };

    repository = new CandleRepository(mockPrisma as unknown as PrismaService);
  });

  describe('upsertMany', () => {
    it('does nothing for an empty array', async () => {
      await repository.upsertMany([]);

      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('runs a single transaction when the batch is under the batch size', async () => {
      const candles = Array.from({ length: 300 }, (_, i) => makeCandle(i));

      await repository.upsertMany(candles);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(mockPrisma.$transaction.mock.calls[0][0]).toHaveLength(300);
    });

    it('splits a large batch into multiple transactions so none risk the default timeout', async () => {
      const candles = Array.from({ length: 1200 }, (_, i) => makeCandle(i));

      await repository.upsertMany(candles);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
      const [first, second, third] = mockPrisma.$transaction.mock.calls.map((call) => call[0]);
      expect(first).toHaveLength(500);
      expect(second).toHaveLength(500);
      expect(third).toHaveLength(200);
    });
  });
});
