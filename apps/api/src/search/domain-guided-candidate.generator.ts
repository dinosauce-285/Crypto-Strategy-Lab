import {
  canonicalSpec,
  type CandidateSpec,
  type RunHistory,
  type StrategyGroup,
  type StrategyMeta,
} from '@csl/contracts';
import { buildCandidate, choose, type RandomFn } from './candidate-space';
import type { CandidateGenerator } from './candidate-generator';

const CORE_GROUPS: readonly StrategyGroup[] = ['Trend', 'Momentum'];
const CONTEXT_GROUPS: readonly StrategyGroup[] = ['Structure', 'Volatility', 'Information'];
const ATTEMPTS_PER_CANDIDATE = 40;

export class DomainGuidedCandidateGenerator implements CandidateGenerator {
  constructor(private readonly random: RandomFn = Math.random) {}

  generate(
    strategies: readonly StrategyMeta[],
    history: RunHistory,
    count: number,
    seen: Set<string>,
  ): CandidateSpec[] {
    const groups = groupBy(strategies);
    const contextGroups = CONTEXT_GROUPS.filter((group) => groups.get(group)?.length);
    if (!CORE_GROUPS.every((group) => groups.get(group)?.length) || contextGroups.length === 0) return [];

    const candidates: CandidateSpec[] = [];
    let attempts = 0;
    const maxAttempts = Math.max(ATTEMPTS_PER_CANDIDATE, count * ATTEMPTS_PER_CANDIDATE);

    while (candidates.length < count && attempts < maxAttempts) {
      attempts += 1;
      const picked = [
        ...CORE_GROUPS.map((group) => choose(groups.get(group) ?? [], this.random)),
        choose(groups.get(choose(contextGroups, this.random)) ?? [], this.random),
      ];
      const spec = buildCandidate(picked, this.random);
      const key = canonicalSpec(spec);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(spec);
    }

    return candidates;
  }
}

function groupBy(strategies: readonly StrategyMeta[]): Map<StrategyGroup, StrategyMeta[]> {
  const groups = new Map<StrategyGroup, StrategyMeta[]>();
  for (const strategy of strategies) {
    groups.set(strategy.group, [...(groups.get(strategy.group) ?? []), strategy]);
  }
  return groups;
}
