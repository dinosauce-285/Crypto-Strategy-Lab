import type { CandidateSpec } from './candidate';

/** Prices and profits stay decimal strings until something means to do arithmetic. */
export interface Trade {
  entryTime: number;
  entryPrice: string;
  exitTime: number;
  exitPrice: string;
  side: 'BUY' | 'SELL';
  profit: string;
}

/**
 * Section 20's metrics. Profit alone ranks a strategy that made 30% after sitting
 * 45% underwater above one that made 25% and never went past 8%.
 *
 * The last two are optional because the brief marks them so; a leaderboard sortable
 * by Sharpe needs them present.
 */
export interface Metrics {
  totalReturn: number;
  profitLoss: string;
  winRate: number;
  tradeCount: number;
  maxDrawdown: number;
  profitFactor?: number;
  sharpeRatio?: number;
}

export const EXPERIMENT_STATUSES = ['completed', 'failed'] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

/**
 * One run, recorded well enough to be rebuilt months later: the whole recipe rather
 * than a strategy name, and the dataset it was judged against.
 *
 * No score and no rank — the leaderboard is computed from these rows on read, so
 * changing the scoring formula never touches anything stored here.
 *
 * `specHash` is derived from the specification and is not a field of it; hashing a
 * value that contained its own hash would be circular. Member order, key order and
 * float precision are normalised first, or one candidate acquires two identities and
 * gets tested twice.
 */
export interface Experiment {
  id: string;
  datasetId: string;
  spec: CandidateSpec;
  specHash: string;
  status: ExperimentStatus;
  metrics?: Metrics;
  /** Why a run failed, for the failed-job count of section 32.7. */
  error?: string;
  createdAt: number;
}
