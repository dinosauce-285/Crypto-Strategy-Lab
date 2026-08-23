import type { CandidateSpec, RunHistory, StrategyMeta } from '@csl/contracts';

export interface CandidateGenerator {
  generate(
    strategies: readonly StrategyMeta[],
    history: RunHistory,
    count: number,
    seen: Set<string>,
  ): CandidateSpec[];
}
