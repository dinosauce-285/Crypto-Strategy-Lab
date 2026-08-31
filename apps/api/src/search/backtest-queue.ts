import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, QueueEvents } from 'bullmq';
import { Redis } from 'ioredis';
import type { BacktestJob } from '@csl/contracts';
import type { JobOutcome } from './job-outcome';
import { DomainError } from '../http/domain-error';

export const BACKTEST_QUEUE = 'backtest';
export const BACKTEST_JOB = 'candidate';

export class QueueUnavailableError extends DomainError {
  readonly status = 503;

  constructor() {
    super('the backtest queue is unreachable — is Redis running on REDIS_URL?');
  }
}

const redisLog = new Logger('Redis');

/**
 * Blocking commands need their own socket, so each BullMQ class is handed its own.
 *
 * A worker waiting for the next job must wait indefinitely; a command issued while
 * answering an HTTP request must not, or a missing Redis turns into a request that never
 * comes back instead of an error somebody can read.
 */
export const createRedis = (config: ConfigService, blocking: boolean): Redis => {
  const client = new Redis(config.get('REDIS_URL', 'redis://localhost:6379'), {
    maxRetriesPerRequest: blocking ? null : 2,
    enableOfflineQueue: blocking,
  });
  let reported = false;
  client.on('error', (error: Error) => {
    if (reported) return;
    reported = true;
    redisLog.warn(`unreachable: ${error.message} — search runs cannot start until it returns`);
  });
  client.on('ready', () => {
    reported = false;
  });
  return client;
};

/**
 * The only file in this module that names BullMQ. Everything above it asks for work to be
 * queued or for the queue to hold, and would not have to change if ADR 0004 were revisited.
 */
@Injectable()
export class BacktestQueue implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue<BacktestJob, JobOutcome>;
  private readonly events: QueueEvents<JobOutcome>;

  constructor(private readonly config: ConfigService) {
    this.connection = createRedis(config, false);
    this.queue = new Queue(BACKTEST_QUEUE, {
      connection: this.connection,
      defaultJobOptions: {
        attempts: Number(config.get('BACKTEST_ATTEMPTS', 3)),
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 500,
        removeOnFail: 500,
      },
    });
    this.events = new QueueEvents(BACKTEST_QUEUE, { connection: createRedis(config, true) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.events.close();
    await this.queue.close();
    await this.connection.quit();
  }

  async add(job: BacktestJob): Promise<string> {
    const added = await this.reachable(this.queue.add(BACKTEST_JOB, job));
    return String(added.id);
  }

  /**
   * Everything left from a process that is gone belongs to no run, and a run's bound is
   * the only thing standing between this queue and an unbounded search — ADR 0021. A
   * paused queue is orphaned state too: pause lives in Redis, the run that ordered it did
   * not.
   */
  async clearOrphans(): Promise<void> {
    await this.reachable(this.queue.obliterate({ force: true }));
    if (await this.reachable(this.queue.isPaused())) await this.resume();
  }

  pause(): Promise<void> {
    return this.reachable(this.queue.pause());
  }

  resume(): Promise<void> {
    return this.reachable(this.queue.resume());
  }

  async discardWaiting(): Promise<void> {
    await this.reachable(this.queue.drain(true));
  }

  async waiting(): Promise<number> {
    const counts = await this.reachable(this.queue.getJobCounts('waiting', 'delayed', 'active'));
    return (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.active ?? 0);
  }

  /**
   * Every queue command waits for the connection to be ready first, and a connection that
   * will never be ready waits for ever — which turns a missing Redis into a request that
   * never answers. A bounded wait turns it back into an error somebody can read.
   */
  private reachable<T>(operation: Promise<T>): Promise<T> {
    const limit = Number(this.config.get('REDIS_COMMAND_TIMEOUT_MS', 3000));
    return Promise.race([
      operation,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new QueueUnavailableError()), limit).unref(),
      ),
    ]);
  }

  onFinished(handler: (jobId: string, outcome: JobOutcome) => void): void {
    this.events.on('completed', ({ jobId, returnvalue }) => {
      if (returnvalue) handler(jobId, returnvalue);
    });
  }

  /** Only a job with no attempts left reaches this; a retry moves back to waiting instead. */
  onFailed(handler: (jobId: string, reason: string) => void): void {
    this.events.on('failed', ({ jobId, failedReason }) => handler(jobId, failedReason));
  }

  onStarted(handler: (jobId: string) => void): void {
    this.events.on('active', ({ jobId }) => handler(jobId));
  }
}
