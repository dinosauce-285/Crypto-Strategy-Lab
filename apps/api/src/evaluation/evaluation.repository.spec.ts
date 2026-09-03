import type { CandidateSpec, Metrics } from '@csl/contracts';
import { DatasetLeaseLostError } from './dataset-lease-lost.error';
import { EvaluationRepository } from './evaluation.repository';
import type { PrismaService } from '../prisma/prisma.service';

describe('EvaluationRepository', () => {
  const data = {
    datasetId: 'dataset-1',
    leaseId: 'lease-1',
    spec: { rule: 'weighted', threshold: 0.5, members: [] } satisfies CandidateSpec,
    specHash: 'hash-1',
    metrics: {
      totalReturn: 0,
      profitLoss: '0',
      winRate: 0,
      tradeCount: 0,
      maxDrawdown: 0,
    } satisfies Metrics,
    trades: [],
  };

  it('does not write an Experiment when its lease has expired', async () => {
    const tx = {
      datasetLease: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      experiment: { create: jest.fn() },
    };
    const prisma = {
      $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) => work(tx)),
    };
    const repository = new EvaluationRepository(prisma as unknown as PrismaService);

    await expect(repository.recordCompleted(data)).rejects.toBeInstanceOf(DatasetLeaseLostError);
    expect(tx.experiment.create).not.toHaveBeenCalled();
  });
});
