import { randomUUID } from 'node:crypto';
import type {
  CandidateSpec,
  RunBound,
  RunCounters,
  RunEndReason,
  RunHistory,
  RunningCandidate,
  RunState,
  RunStatus,
  SearchHistoryEntry,
  SearchMode,
  StrategyRef,
} from '@csl/contracts';
import type { JobOutcome } from './job-outcome';

const HISTORY_LIMIT = 25;

interface PendingCandidate {
  spec: CandidateSpec;
  specHash: string;
}

/**
 * One run and everything it knows about itself. It is deliberately not a database row:
 * a run belongs to the process that started it, and the queue is emptied of what it left
 * behind rather than resumed by whoever boots next (ADR 0021).
 */
export class ActiveRun {
  readonly runId = randomUUID();
  readonly startedAt = Date.now();
  state: RunState = 'running';
  sourceExhausted = false;
  sinceImprovement = 0;
  queued = 0;
  endedAt?: number;
  endReason?: RunEndReason;

  private pausedTotalMs = 0;
  private pausedAt?: number;
  private current?: RunningCandidate;
  private currentJobId?: string;

  /** jobId to candidate, so queue events can be named without asking Redis. */
  readonly pending = new Map<string, PendingCandidate>();

  private tried = 0;
  private failed = 0;
  private duplicates = 0;
  private durationTotalMs = 0;
  private durationCount = 0;
  private best?: RunCounters['best'];
  private top: SearchHistoryEntry[] = [];

  constructor(
    readonly datasetId: string,
    readonly strategyRefs: readonly StrategyRef[],
    readonly bound: RunBound,
    readonly mode: SearchMode,
  ) {}

  /**
   * Named for the screen, not for the loop — section 46 step 4. With several workers this
   * holds the latest to start, and it is dropped when that same job comes back.
   */
  recordStarted(jobId: string, candidate: RunningCandidate): void {
    this.currentJobId = jobId;
    this.current = candidate;
  }

  recordSettled(jobId: string): void {
    if (this.currentJobId !== jobId) return;
    this.currentJobId = undefined;
    this.current = undefined;
  }

  recordFinished(outcome: JobOutcome, spec?: CandidateSpec): void {
    this.tried += 1;
    if (outcome.status === 'duplicate') {
      this.duplicates += 1;
      this.sinceImprovement += 1;
      return;
    }
    this.durationTotalMs += outcome.durationMs;
    this.durationCount += 1;
    const totalReturn = outcome.metrics?.totalReturn;
    if (spec && typeof totalReturn === 'number') {
      this.recordHistory({ spec, specHash: outcome.specHash, score: totalReturn });
    }
    if (outcome.experimentId && typeof totalReturn === 'number' && this.beats(totalReturn)) {
      this.best = { experimentId: outcome.experimentId, specHash: outcome.specHash, totalReturn };
      this.sinceImprovement = 0;
      return;
    }
    this.sinceImprovement += 1;
  }

  recordFailed(): void {
    this.tried += 1;
    this.failed += 1;
    this.sinceImprovement += 1;
  }

  pause(now: number): void {
    this.state = 'paused';
    this.pausedAt = now;
  }

  resume(now: number): void {
    this.pausedTotalMs += this.pausedFor(now);
    this.pausedAt = undefined;
    this.state = 'running';
  }

  /** Milliseconds this run has not been spending its budget — ADR 0044. */
  pausedMs(now: number): number {
    return this.pausedTotalMs + this.pausedFor(now);
  }

  /** How long the pause it is in right now has lasted, which is what the lease bounds. */
  currentPauseMs(now: number): number {
    return this.pausedFor(now);
  }

  end(reason: RunEndReason): void {
    this.state = 'ended';
    this.endReason = reason;
    this.endedAt = Date.now();
    this.current = undefined;
    this.currentJobId = undefined;
  }

  counters(): RunCounters {
    return {
      tried: this.tried,
      failed: this.failed,
      duplicates: this.duplicates,
      queued: this.queued,
      averageBacktestMs:
        this.durationCount > 0 ? Math.round(this.durationTotalMs / this.durationCount) : undefined,
      best: this.best,
    };
  }

  history(): RunHistory {
    return { tried: this.tried, candidates: this.top, best: this.best };
  }

  status(): RunStatus {
    return {
      runId: this.runId,
      datasetId: this.datasetId,
      strategyRefs: this.strategyRefs.map((ref) => ({ ...ref })),
      mode: this.mode,
      state: this.state,
      bound: this.bound,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      endReason: this.endReason,
      current: this.current,
      counters: this.counters(),
    };
  }

  private pausedFor(now: number): number {
    return this.pausedAt === undefined ? 0 : Math.max(0, now - this.pausedAt);
  }

  private beats(totalReturn: number): boolean {
    return this.best === undefined || totalReturn > this.best.totalReturn;
  }

  private recordHistory(entry: SearchHistoryEntry): void {
    this.top = [...this.top, entry].sort((a, b) => b.score - a.score).slice(0, HISTORY_LIMIT);
  }
}
