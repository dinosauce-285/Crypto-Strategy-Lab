import { EventEmitter2 } from '@nestjs/event-emitter';
import type {
  BacktestJob,
  CandidateSpec,
  Dataset,
  RunHistory,
  SearchMode,
  StrategyRef,
} from '@csl/contracts';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import { BacktestQueue } from './backtest-queue';
import { DatasetRepository } from './dataset.repository';
import type { JobOutcome } from './job-outcome';
import { CandidateSource } from './ports/candidate-source.port';
import { MAX_PAUSE_MS } from './run-bounds';
import { DatasetNotFoundError, NoActiveRunError, SearchService } from './search.service';

type FinishedHandler = (jobId: string, outcome: JobOutcome) => void;
type FailedHandler = (jobId: string, reason: string) => void;
type StartedHandler = (jobId: string) => void;

class FakeQueue implements Partial<BacktestQueue> {
  finished?: FinishedHandler;
  failed?: FailedHandler;
  started?: StartedHandler;
  private nextId = 0;

  onFinished(handler: FinishedHandler): void {
    this.finished = handler;
  }

  onFailed(handler: FailedHandler): void {
    this.failed = handler;
  }

  onStarted(handler: StartedHandler): void {
    this.started = handler;
  }

  async clearOrphans(): Promise<void> {}

  async add(job: BacktestJob): Promise<string> {
    this.nextId += 1;
    return `${job.datasetId}-${this.nextId}`;
  }

  async waiting(): Promise<number> {
    return 0;
  }

  async discardWaiting(): Promise<void> {}

  async pause(): Promise<void> {}

  async resume(): Promise<void> {}
}

class FakeChannel extends ChannelPublisher {
  publish(): void {}
}

class FakeDatasets implements Partial<DatasetRepository> {
  constructor(private readonly known: readonly string[]) {}

  async findById(id: string): Promise<Dataset | null> {
    return this.known.includes(id) ? dataset(id) : null;
  }
}

class OneCandidateSource extends CandidateSource {
  private emitted = false;

  reset(_mode: SearchMode, _strategyRefs: readonly StrategyRef[]): void {
    this.emitted = false;
  }

  async next(_history: RunHistory, _count: number): Promise<CandidateSpec[]> {
    if (this.emitted) return [];
    this.emitted = true;
    return [spec()];
  }
}

const outcome = (datasetId: string): JobOutcome => ({
  status: 'completed',
  specHash: 'old-hash',
  datasetId,
  experimentId: 'old-experiment',
  metrics: {
    totalReturn: 1,
    profitLoss: '1',
    winRate: 1,
    tradeCount: 1,
    maxDrawdown: 0,
  },
  durationMs: 10,
});

describe('SearchService queue events', () => {
  it('ignores completed and failed events that are not pending on the current run', async () => {
    const queue = new FakeQueue();
    const service = new SearchService(
      queue as unknown as BacktestQueue,
      new FakeChannel(),
      new EventEmitter2(),
      new FakeDatasets(['dataset-new']) as unknown as DatasetRepository,
      new OneCandidateSource(),
    );

    await service.start('dataset-new', [{ id: 'ma', version: 1 }], { maxCandidates: 10 }, 'random');
    queue.finished?.('old-job', outcome('dataset-old'));
    queue.failed?.('older-job', 'old failure');

    const status = service.status();
    expect(status?.counters.tried).toBe(0);
    expect(status?.counters.failed).toBe(0);
    expect(status?.counters.best).toBeUndefined();
    expect(status?.strategyRefs).toEqual([{ id: 'ma', version: 1 }]);
    await service.stop();
    service.onModuleDestroy();
  });
});

describe('SearchService pause lease', () => {
  const build = () =>
    new SearchService(
      new FakeQueue() as unknown as BacktestQueue,
      new FakeChannel(),
      new EventEmitter2(),
      new FakeDatasets(['dataset-1']) as unknown as DatasetRepository,
      new OneCandidateSource(),
    );

  const aTick = () => new Promise((resolve) => setTimeout(resolve, 700));

  afterEach(() => jest.restoreAllMocks());

  it('does not end a paused run whose wall clock has passed its budget', async () => {
    const service = build();
    await service.start('dataset-1', [{ id: 'ma', version: 1 }], { maxDurationMs: 40 }, 'random');
    await service.pause();

    await aTick();

    const status = service.status();
    expect(status?.state).toBe('paused');
    expect(status?.endReason).toBeUndefined();
    await service.stop();
    service.onModuleDestroy();
  });

  it('ends a run left paused past its lease, and says so', async () => {
    const service = build();
    await service.start('dataset-1', [{ id: 'ma', version: 1 }], { maxCandidates: 10 }, 'random');
    await service.pause();
    jest.spyOn(Date, 'now').mockReturnValue(Date.now() + MAX_PAUSE_MS + 1);

    await aTick();

    const status = service.status();
    expect(status?.state).toBe('ended');
    expect(status?.endReason).toBe('abandoned');
    service.onModuleDestroy();
  });
});

describe('SearchService run-state errors', () => {
  const build = () =>
    new SearchService(
      new FakeQueue() as unknown as BacktestQueue,
      new FakeChannel(),
      new EventEmitter2(),
      new FakeDatasets(['dataset-1']) as unknown as DatasetRepository,
      new OneCandidateSource(),
    );

  it('says a paused run is paused, rather than claiming no run exists', async () => {
    const service = build();
    await service.start('dataset-1', [{ id: 'ma', version: 1 }], { maxCandidates: 10 }, 'random');
    await service.pause();

    await expect(service.pause()).rejects.toThrow('the run is paused, not running');
    await service.stop();
    service.onModuleDestroy();
  });

  it('says a running run is running when asked to resume it', async () => {
    const service = build();
    await service.start('dataset-1', [{ id: 'ma', version: 1 }], { maxCandidates: 10 }, 'random');

    await expect(service.resume()).rejects.toThrow('the run is running, not paused');
    await service.stop();
    service.onModuleDestroy();
  });

  it('still reports no run at all as a 404-shaped error', async () => {
    const service = build();
    await expect(service.pause()).rejects.toBeInstanceOf(NoActiveRunError);
    service.onModuleDestroy();
  });
});

describe('SearchService dataset guard', () => {
  it('refuses to start on a dataset that does not exist, instead of running a doomed loop', async () => {
    const service = new SearchService(
      new FakeQueue() as unknown as BacktestQueue,
      new FakeChannel(),
      new EventEmitter2(),
      new FakeDatasets([]) as unknown as DatasetRepository,
      new OneCandidateSource(),
    );

    await expect(
      service.start('missing', [{ id: 'ma', version: 1 }], { maxCandidates: 10 }, 'random'),
    ).rejects.toBeInstanceOf(DatasetNotFoundError);
    expect(service.status()).toBeNull();
    service.onModuleDestroy();
  });
});

function dataset(id: string): Dataset {
  return {
    id,
    pair: 'BTCUSDT',
    timeframe: '1m',
    from: 0,
    to: 1,
    rules: {
      entryPrice: 'signal-close',
      feeRate: '0.001',
      warmupCandles: 0,
      profitMode: 'simple',
      drawdownMode: 'trade-close',
    },
  };
}

function spec(): CandidateSpec {
  return {
    rule: 'weighted',
    threshold: 0.3,
    members: [
      {
        id: 'ma',
        version: 1,
        params: { fastPeriod: 2, slowPeriod: 5 },
        paramsHash: 'params',
        weight: 1,
      },
    ],
  };
}
