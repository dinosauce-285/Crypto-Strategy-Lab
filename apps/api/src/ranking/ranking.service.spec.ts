import { NotFoundException } from '@nestjs/common';
import type { PrismaService } from '../prisma/prisma.service';
import { RankingService } from './ranking.service';

describe('RankingService', () => {
  let service: RankingService;
  let mockPrisma: jest.Mocked<PrismaService>;

  const mockExperiments = [
    {
      id: 'exp-1',
      datasetId: 'dataset-1',
      spec: { rule: 'weighted', threshold: 0.5, members: [] },
      specHash: 'hash-1',
      status: 'completed',
      totalReturn: 0.30,
      profitLoss: '300',
      winRate: 0.70,
      tradeCount: 25,
      maxDrawdown: 0.08,
      profitFactor: 2.5,
      sharpeRatio: 1.8,
      createdAt: new Date(1000),
    },
    {
      id: 'exp-2',
      datasetId: 'dataset-1',
      spec: { rule: 'weighted', threshold: 0.5, members: [] },
      specHash: 'hash-2',
      status: 'completed',
      totalReturn: 0.15,
      profitLoss: '150',
      winRate: 0.55,
      tradeCount: 20,
      maxDrawdown: 0.05,
      profitFactor: 1.5,
      sharpeRatio: 1.2,
      createdAt: new Date(2000),
    },
  ];

  beforeEach(() => {
    mockPrisma = {
      dataset: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === 'dataset-1') {
            return Promise.resolve({ id: 'dataset-1' });
          }
          return Promise.resolve(null);
        }),
      },
      experiment: {
        findMany: jest.fn().mockResolvedValue(mockExperiments),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new RankingService(mockPrisma);
  });

  it('ranks completed experiments by overall score descending', async () => {
    const results = await service.getLeaderboard({ datasetId: 'dataset-1' });

    expect(results).toHaveLength(2);
    expect(results[0].rank).toBe(1);
    expect(results[0].experimentId).toBe('exp-1');
    expect(results[1].rank).toBe(2);
    expect(results[1].experimentId).toBe('exp-2');
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it('supports sorting by custom metric (e.g. maxDrawdown ascending)', async () => {
    const results = await service.getLeaderboard({
      datasetId: 'dataset-1',
      sortBy: 'maxDrawdown',
      direction: 'asc',
    });

    expect(results[0].experimentId).toBe('exp-2'); // 0.05 < 0.08
    expect(results[1].experimentId).toBe('exp-1');
  });

  it('returns empty array when datasetId is missing', async () => {
    const results = await service.getLeaderboard({ datasetId: '' });
    expect(results).toEqual([]);
  });

  it('throws NotFoundException when dataset does not exist', async () => {
    await expect(service.getLeaderboard({ datasetId: 'non-existent' })).rejects.toThrow(
      NotFoundException,
    );
  });
});
