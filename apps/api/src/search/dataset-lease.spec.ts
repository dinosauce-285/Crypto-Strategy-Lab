import { Logger } from '@nestjs/common';
import { acquireDatasetLease } from './dataset-lease';
import type { DatasetRepository } from './dataset.repository';

describe('acquireDatasetLease', () => {
  afterEach(() => jest.useRealTimers());

  it('renews a lease while work is running and releases it afterward', async () => {
    jest.useFakeTimers();
    const datasets = {
      acquireLease: jest.fn().mockResolvedValue(true),
      renewLease: jest.fn().mockResolvedValue(true),
      releaseLease: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DatasetRepository>;
    const lease = await acquireDatasetLease(datasets, 'dataset-1', 'lease-1');
    await jest.advanceTimersByTimeAsync(60_000);
    await lease.release();

    expect(datasets.renewLease).toHaveBeenCalledTimes(1);
    expect(datasets.releaseLease).toHaveBeenCalledWith('lease-1');
  });

  it('observes renewal failures instead of leaving an unhandled rejection', async () => {
    jest.useFakeTimers();
    const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    const datasets = {
      acquireLease: jest.fn().mockResolvedValue(true),
      renewLease: jest.fn().mockRejectedValue(new Error('database unavailable')),
      releaseLease: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<DatasetRepository>;

    const lease = await acquireDatasetLease(datasets, 'dataset-1', 'lease-1');
    await jest.advanceTimersByTimeAsync(60_000);
    await lease.release();

    expect(warn).toHaveBeenCalledWith(expect.stringContaining('database unavailable'));
    warn.mockRestore();
  });
});
