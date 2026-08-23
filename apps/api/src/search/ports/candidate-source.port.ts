import type { CandidateSpec, RunHistory, SearchMode, StrategyRef } from '@csl/contracts';

/**
 * Where candidates come from — T17. It is handed the history of the run so far and
 * returns the next batch, or nothing when it has no more to give (ADR 0013).
 *
 * Nothing here says how they are chosen. Replacing a random generator with a genetic one
 * is a different provider bound to this token, which is the scenario section 42 sets.
 */
export abstract class CandidateSource {
  abstract reset(mode: SearchMode, strategyRefs: readonly StrategyRef[]): void;
  abstract next(history: RunHistory, count: number): Promise<CandidateSpec[]>;
}

export class InvalidSearchSpaceError extends Error {}
