import { Injectable, Logger, OnModuleDestroy, Optional } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  EVENTS,
  MESSAGES,
  searchRunTopic,
  type RunBound,
  type RunEndReason,
  type RunState,
  type RunStatus,
  type SearchMode,
  type StrategyRef,
} from '@csl/contracts';
import { DomainError } from '../http/domain-error';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import { ActiveRun } from './active-run';
import { BacktestQueue } from './backtest-queue';
import { DatasetRepository } from './dataset.repository';
import type { JobOutcome } from './job-outcome';
import { CandidateSource } from './ports/candidate-source.port';
import { leaseExpired, reachedBound } from './run-bounds';
import { specHash } from './spec-hash';

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
    private readonly datasets: DatasetRepository,
    @Optional() private readonly source?: CandidateSource,
  ) {
    this.queue.onStarted((jobId) => this.onStarted(jobId));
    this.queue.onFinished((jobId, outcome) => this.onFinished(jobId, outcome));
    this.queue.onFailed((jobId, reason) => this.onFailed(jobId, reason));
  }

  onModuleDestroy(): void {
    this.stopTicking();
  }

  async start(
    datasetId: string,
    strategyRefs: readonly StrategyRef[],
    bound: RunBound,
    mode: SearchMode,
  ): Promise<RunStatus> {
    if (this.run && this.run.state !== 'ended') throw new RunAlreadyActiveError();
    if (!(await this.datasets.findById(datasetId))) throw new DatasetNotFoundError(datasetId);
    await this.queue.clearOrphans();
    this.source?.reset(mode, strategyRefs);
    const run = new ActiveRun(datasetId, strategyRefs, bound, mode);
    this.run = run;
    if (!this.source) this.logger.warn('no CandidateSource is registered — T17 supplies it');
    this.ticker = setInterval(() => void this.tick(), TICK_MS);
    await this.tick();
    return run.status();
  }

  async pause(): Promise<RunStatus> {
    const run = this.inState('running');
    await this.queue.pause();
    run.pause(Date.now());
    return this.publish(run);
  }

  async resume(): Promise<RunStatus> {
    const run = this.inState('paused');
    await this.queue.resume();
    run.resume(Date.now());
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
    try {
      await this.advance(run);
    } catch (error) {
      this.logger.error(`run ${run.runId} could not advance: ${String(error)}`);
    }
  }

  /**
   * A paused run is asked about its lease and nothing else — every other bound is a budget,
   * and a budget is not spent while paused (ADR 0045).
   */
  private async advance(run: ActiveRun): Promise<void> {
    run.queued = await this.queue.waiting();
    const now = Date.now();

    if (run.state === 'paused') {
      if (leaseExpired(run.currentPauseMs(now))) await this.close(run, 'abandoned');
      return;
    }

    await this.fill(run);
    const reason = reachedBound({
      bound: run.bound,
      counters: run.counters(),
      startedAt: run.startedAt,
      now,
      pausedMs: run.pausedMs(now),
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
        const hash = specHash(spec);
        const jobId = await this.queue.add({ spec, datasetId: run.datasetId });
        run.pending.set(jobId, { spec, specHash: hash });
        this.events.emit(EVENTS.StrategyGenerated, {
          spec,
          specHash: hash,
          datasetId: run.datasetId,
        });
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
    const pending = run.pending.get(jobId);
    if (pending) run.recordStarted(jobId, { spec: pending.spec, specHash: pending.specHash });
    this.events.emit(EVENTS.BacktestStarted, {
      specHash: pending?.specHash ?? jobId,
      datasetId: run.datasetId,
    });
    void this.publish(run);
  }

  private onFinished(jobId: string, outcome: JobOutcome): void {
    const run = this.run;
    if (!run) return;
    const pending = run.pending.get(jobId);
    if (!pending) return;
    run.pending.delete(jobId);
    run.recordSettled(jobId);
    run.recordFinished(outcome, pending.spec);
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
    if (!run.pending.has(jobId)) return;
    run.pending.delete(jobId);
    run.recordSettled(jobId);
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

  /**
   * "No run" and "the run is in the other state" are different answers to different
   * mistakes; one 404 for both told a caller that a run it can see does not exist.
   */
  private inState(want: RunState): ActiveRun {
    const run = this.current();
    if (run.state !== want) throw new RunNotInStateError(run.state, want);
    return run;
  }
}

export class NoActiveRunError extends DomainError {
  readonly status = 404;

  constructor() {
    super('no run is active');
  }
}

export class RunNotInStateError extends DomainError {
  readonly status = 409;

  constructor(actual: RunState, wanted: RunState) {
    super(`the run is ${actual}, not ${wanted}`);
  }
}

export class RunAlreadyActiveError extends DomainError {
  readonly status = 409;

  constructor() {
    super('a run is already active — stop it before starting another');
  }
}

export class DatasetNotFoundError extends DomainError {
  readonly status = 404;

  constructor(datasetId: string) {
    super(`Dataset "${datasetId}" not found`);
  }
}
