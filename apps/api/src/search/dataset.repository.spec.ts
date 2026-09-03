import { Prisma } from '../generated/prisma/client';
import { DatasetRepository } from './dataset.repository';
import type { PrismaService } from '../prisma/prisma.service';

describe('DatasetRepository', () => {
  const row = {
    id: 'dataset-1',
    pair: 'BTCUSDT',
    timeframe: '1h',
    from: new Date(1700000000000),
    to: new Date(1700100000000),
    entryPrice: 'next-open',
    feeRate: new Prisma.Decimal('0.001'),
    warmupCandles: 20,
    profitMode: 'compound',
    drawdownMode: 'trade-close',
    createdAt: new Date(),
  };

  let repository: DatasetRepository;
  let prisma: { dataset: { delete: jest.Mock }; datasetLease: { deleteMany: jest.Mock; create: jest.Mock; updateMany: jest.Mock } };

  beforeEach(() => {
    prisma = { dataset: { delete: jest.fn() }, datasetLease: { deleteMany: jest.fn(), create: jest.fn(), updateMany: jest.fn() } };
    repository = new DatasetRepository(prisma as unknown as PrismaService);
  });

  it('returns the deleted dataset', async () => {
    prisma.dataset.delete.mockResolvedValue(row);

    await expect(repository.deleteIfUnused(row.id)).resolves.toEqual({
      kind: 'deleted',
      dataset: {
        id: row.id,
        pair: row.pair,
        timeframe: row.timeframe,
        from: row.from.getTime(),
        to: row.to.getTime(),
        rules: {
          entryPrice: row.entryPrice,
          feeRate: '0.001',
          warmupCandles: row.warmupCandles,
          profitMode: row.profitMode,
          drawdownMode: row.drawdownMode,
        },
      },
    });
  });

  it('returns not-found for a missing dataset', async () => {
    prisma.dataset.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: 'test' }),
    );

    await expect(repository.deleteIfUnused('missing')).resolves.toEqual({ kind: 'not-found' });
  });

  it('returns in-use for a dataset referenced by an experiment', async () => {
    prisma.dataset.delete.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('referenced', { code: 'P2003', clientVersion: 'test' }),
    );

    await expect(repository.deleteIfUnused(row.id)).resolves.toEqual({ kind: 'in-use' });
  });
});
