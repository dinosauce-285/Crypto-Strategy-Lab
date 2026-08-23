import { EventEmitter2 } from '@nestjs/event-emitter';
import type { BacktestJob, CandidateSpec, RunHistory, SearchMode } from '@csl/contracts';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import { BacktestQueue } from './backtest-queue';
import type { JobOutcome } from './job-outcome';
import { CandidateSource } from './ports/candidate-source.port';
import { SearchService } from './search.service';

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

class OneCandidateSource extends CandidateSource {
  private emitted = false;

  reset(_mode: SearchMode): void {
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
      new OneCandidateSource(),
    );

    await service.start('dataset-new', { maxCandidates: 10 }, 'random');
    queue.finished?.('old-job', outcome('dataset-old'));
    queue.failed?.('older-job', 'old failure');

    const status = service.status();
    expect(status?.counters.tried).toBe(0);
    expect(status?.counters.failed).toBe(0);
    expect(status?.counters.best).toBeUndefined();
    await service.stop();
    service.onModuleDestroy();
  });
});

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
