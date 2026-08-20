import type { Metrics } from '@csl/contracts';

export const JOB_OUTCOMES = ['completed', 'duplicate'] as const;
export type JobOutcomeStatus = (typeof JOB_OUTCOMES)[number];

/**
 * What a worker hands back through the queue. The API process learns of a finished
 * candidate from this and nothing else: the in-process bus of ADR 0003 does not cross a
 * process boundary, and the worker is a separate process by ADR 0004.
 *
 * A failure is not in here. A candidate that ends permanently failed is written as a
 * failed experiment by the worker and then thrown, so the queue reports it as failed and
 * the row and the count cannot disagree.
 */
export interface JobOutcome {
  status: JobOutcomeStatus;
  specHash: string;
  datasetId: string;
  experimentId?: string;
  metrics?: Metrics;
  durationMs: number;
}
