import { Logger } from '@nestjs/common';
import { DATASET_LEASE_RENEW_MS } from '../prisma/dataset-lease-policy';
import { DatasetNotFoundError } from './dataset-errors';
import { DatasetRepository } from './dataset.repository';

export interface DatasetLease {
  id: string;
  release(): Promise<void>;
}

const logger = new Logger('DatasetLease');

export async function acquireDatasetLease(
  datasets: DatasetRepository,
  datasetId: string,
  leaseId: string,
): Promise<DatasetLease> {
  if (!(await datasets.acquireLease(datasetId, leaseId))) throw new DatasetNotFoundError(datasetId);

  const renewal = setInterval(() => {
    void datasets.renewLease(leaseId).catch((error: unknown) => {
      logger.warn(`Could not renew Dataset lease ${leaseId}: ${String(error)}`);
    });
  }, DATASET_LEASE_RENEW_MS);

  return {
    id: leaseId,
    async release(): Promise<void> {
      clearInterval(renewal);
      await datasets.releaseLease(leaseId);
    },
  };
}
