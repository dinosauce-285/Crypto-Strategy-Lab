import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EVENTS,
  MESSAGES,
  canonicalSpec,
  searchRunTopic,
  type RunBound,
  type RunEndReason,
  type RunStatus,
} from '@csl/contracts';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import { ActiveRun } from './active-run';
import { BacktestQueue } from './backtest-queue';
import type { JobOutcome } from './job-outcome';
import { CandidateSource } from './ports/candidate-source.port';
import { reachedBound } from './run-bounds';

const TICK_MS = 500;
const QUEUE_DEPTH = 50;

@Injectable()
export class SearchService implements OnModuleDestroy {
  private readonly logger = new Logger(SearchService.name);
  private run?: ActiveRun;
  private ticker?: NodeJS.Timeout;

  constructor(
    private readonly queue: BacktestQueue,
    private readonly channel: ChannelPublisher,
    private readonly events: EventEmitter2,
    @Optional() private readonly source?: CandidateSource,
  ) {
    this.queue.onStarted((jobId) => this.onStarted(jobId));
    this.queue.onFinished((jobId, outcome) => this.onFinished(jobId, outcome));
    this.queue.onFailed((jobId, reason) => this.onFailed(jobId, reason));
  }

  onModuleDestroy(): void {
    this.stopTicking();
  }

  async start(datasetId: string, bound: RunBound): Promise<RunStatus> {
    if (this.run && this.run.state !== 'ended') throw new RunAlreadyActiveError();
    await this.queue.clearOrphans();
    const run = new ActiveRun(datasetId, bound);
    this.run = run;
    if (!this.source) this.logger.warn('no CandidateSource is registered — T17 supplies it');
    this.ticker = setInterval(() => void this.tick(), TICK_MS);
    await this.tick();
    return run.status();
  }

  async pause(): Promise<RunStatus> {
    const run = this.running();
    await this.queue.pause();
    run.state = 'paused';
    return this.publish(run);
  }

  async resume(): Promise<RunStatus> {
    const run = this.current();
    await this.queue.resume();
    run.state = 'running';
    return this.publish(run);
  }

  stop(): Promise<RunStatus> {
    return this.close(this.current(), 'stopped');
  }

  status(): RunStatus | null {
    return this.run?.status() ?? null;
  }

  private async tick(): Promise<void> {
    const run = this.run;
    if (!run || run.state === 'ended') return;

    run.queued = await this.queue.waiting();
    if (run.state === 'running') await this.fill(run);

    const reason = reachedBound({
      bound: run.bound,
      counters: run.counters(),
      startedAt: run.startedAt,
      now: Date.now(),
      sinceImprovement: run.sinceImprovement,
      sourceExhausted: run.sourceExhausted,
    });
    if (reason) await this.close(run, reason);
  }

  private async fill(run: ActiveRun): Promise<void> {
    if (run.sourceExhausted || !this.source) {
      run.sourceExhausted = true;
      return;
    }
    let room = this.room(run);
    while (room > 0) {
      const specs = await this.source.next(run.history(), room);
      if (specs.length === 0) {
        run.sourceExhausted = true;
        return;
      }
      for (const spec of specs.slice(0, room)) {
        const jobId = await this.queue.add({ spec, datasetId: run.datasetId });
        run.pending.set(jobId, canonicalSpec(spec));
        run.queued += 1;
      }
      room = this.room(run);
    }
  }

  /**
   * How many more may be queued. Bounded by the queue depth so a run does not enqueue ten
   * thousand jobs at once, and by what is left of the candidate budget — without the
   * second, a run bounded at 400 tests 450, because the bound is noticed a tick after the
   * batch that passed it was already queued.
   */
  private room(run: ActiveRun): number {
    const depth = QUEUE_DEPTH - run.queued;
    const budget = run.bound.maxCandidates;
    if (budget === undefined) return depth;
    return Math.max(0, Math.min(depth, budget - run.counters().tried - run.queued));
  }

  private onStarted(jobId: string): void {
    const run = this.run;
    if (!run) return;
    this.events.emit(EVENTS.BacktestStarted, {
      specHash: run.pending.get(jobId) ?? jobId,
      datasetId: run.datasetId,
    });
  }

  private onFinished(jobId: string, outcome: JobOutcome): void {
    const run = this.run;
    if (!run) return;
    run.pending.delete(jobId);
    run.recordFinished(outcome);
    if (outcome.experimentId && outcome.metrics) {
      this.events.emit(EVENTS.BacktestCompleted, {
        experimentId: outcome.experimentId,
        datasetId: outcome.datasetId,
        tradeCount: outcome.metrics.tradeCount,
      });
      this.events.emit(EVENTS.StrategyEvaluated, {
        experimentId: outcome.experimentId,
        datasetId: outcome.datasetId,
        metrics: outcome.metrics,
      });
    }
    void this.publish(run);
  }

  private onFailed(jobId: string, reason: string): void {
    const run = this.run;
    if (!run) return;
    run.pending.delete(jobId);
    run.recordFailed();
    this.logger.warn(`candidate failed permanently: ${reason}`);
    void this.publish(run);
  }

  /**
   * A candidate waiting when the run ends belongs to a bound that has been reached, so it
   * is discarded. One already being tested is left to finish and is still recorded — it
   * was accepted before the end, and throwing away a result we computed and stored would
   * make the counters lie in the other direction.
   */
  private async close(run: ActiveRun, reason: RunEndReason): Promise<RunStatus> {
    this.stopTicking();
    await this.queue.discardWaiting();
    run.queued = 0;
    run.end(reason);
    return this.publish(run);
  }

  private publish(run: ActiveRun): RunStatus {
    const status = run.status();
    this.channel.publish(searchRunTopic(run.runId), {
      type: MESSAGES.SearchProgress,
      payload: { status },
    });
    return status;
  }

  private stopTicking(): void {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = undefined;
  }

  private current(): ActiveRun {
    if (!this.run || this.run.state === 'ended') throw new NoActiveRunError();
    return this.run;
  }

  private running(): ActiveRun {
    const run = this.current();
    if (run.state !== 'running') throw new NoActiveRunError();
    return run;
  }
}

export class NoActiveRunError extends Error {
  constructor() {
    super('no run is active');
  }
}

export class RunAlreadyActiveError extends Error {
  constructor() {
    super('a run is already active — stop it before starting another');
  }
}
