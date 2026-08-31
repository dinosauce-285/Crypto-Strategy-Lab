import type { RunBound, RunCounters, RunEndReason } from '@csl/contracts';

/** A pause nobody returns from ends the run rather than holding it forever — ADR 0045. */
export const MAX_PAUSE_MS = 30 * 60 * 1000;

/**
 * Ceilings, because "greater than zero" let `1e308` through: a run of 1e308 candidates
 * satisfies the letter of ADR 0021 and is unbounded in every sense section 23 means.
 */
export const BOUND_CEILINGS = {
  maxCandidates: 1_000_000,
  maxDurationMs: 24 * 60 * 60 * 1000,
  noImprovementLimit: 1_000_000,
} as const;

export interface BoundState {
  bound: RunBound;
  counters: RunCounters;
  startedAt: number;
  now: number;
  pausedMs: number;
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
  if (positive(bound.maxDurationMs) && activeMs(state) >= bound.maxDurationMs) {
    return 'duration';
  }
  if (positive(bound.noImprovementLimit) && sinceImprovement >= bound.noImprovementLimit) {
    return 'plateau';
  }
  if (state.sourceExhausted && counters.queued === 0) return 'exhausted';
  return null;
}

/** The only end a paused run can reach — every other bound waits for it to resume. */
export const leaseExpired = (pausedFor: number): boolean => pausedFor >= MAX_PAUSE_MS;

const activeMs = (state: BoundState): number => state.now - state.startedAt - state.pausedMs;
