import type { RunBound, RunCounters, RunEndReason } from '@csl/contracts';

export interface BoundState {
  bound: RunBound;
  counters: RunCounters;
  startedAt: number;
  now: number;
  sinceImprovement: number;
  sourceExhausted: boolean;
}

const positive = (value?: number): value is number => typeof value === 'number' && value > 0;

/** ADR 0021: a run with neither of the two hard bounds is refused rather than defaulted. */
export const isBounded = (bound: RunBound): boolean =>
  positive(bound.maxCandidates) || positive(bound.maxDurationMs);

/**
 * The stop condition, with nothing else in it — no queue, no clock, no injection. The one
 * thing section 23 marks is the one thing that should be readable on its own.
 */
export function reachedBound(state: BoundState): RunEndReason | null {
  const { bound, counters, sinceImprovement } = state;
  if (positive(bound.maxCandidates) && counters.tried >= bound.maxCandidates) return 'candidates';
  if (positive(bound.maxDurationMs) && state.now - state.startedAt >= bound.maxDurationMs) {
    return 'duration';
  }
  if (positive(bound.noImprovementLimit) && sinceImprovement >= bound.noImprovementLimit) {
    return 'plateau';
  }
  if (state.sourceExhausted && counters.queued === 0) return 'exhausted';
  return null;
}
