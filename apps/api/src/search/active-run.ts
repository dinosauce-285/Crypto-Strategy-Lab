import { randomUUID } from 'node:crypto';
import type {
  CandidateSpec,
  RunBound,
  RunCounters,
  RunEndReason,
  RunHistory,
  RunState,
  RunStatus,
  SearchHistoryEntry,
  SearchMode,
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
    readonly bound: RunBound,
    readonly mode: SearchMode,
  ) {}

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

  end(reason: RunEndReason): void {
    this.state = 'ended';
    this.endReason = reason;
    this.endedAt = Date.now();
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
      mode: this.mode,
      state: this.state,
      bound: this.bound,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      endReason: this.endReason,
      counters: this.counters(),
    };
  }

  private beats(totalReturn: number): boolean {
    return this.best === undefined || totalReturn > this.best.totalReturn;
  }

  private recordHistory(entry: SearchHistoryEntry): void {
    this.top = [...this.top, entry].sort((a, b) => b.score - a.score).slice(0, HISTORY_LIMIT);
  }
}
