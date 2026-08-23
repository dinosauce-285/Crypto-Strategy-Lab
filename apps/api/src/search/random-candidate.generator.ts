import { canonicalSpec, type CandidateSpec, type RunHistory, type StrategyMeta } from '@csl/contracts';
import { buildCandidate, shuffle, type RandomFn } from './candidate-space';
import type { CandidateGenerator } from './candidate-generator';

const MAX_MEMBERS = 4;
const ATTEMPTS_PER_CANDIDATE = 40;

export class RandomCandidateGenerator implements CandidateGenerator {
  constructor(private readonly random: RandomFn = Math.random) {}

  generate(
    strategies: readonly StrategyMeta[],
    history: RunHistory,
    count: number,
    seen: Set<string>,
  ): CandidateSpec[] {
    const candidates: CandidateSpec[] = [];
    const maxMembers = Math.min(MAX_MEMBERS, strategies.length);
    if (maxMembers === 0) return candidates;

    const minMembers = maxMembers === 1 ? 1 : 2;
    let attempts = 0;
    const maxAttempts = Math.max(ATTEMPTS_PER_CANDIDATE, count * ATTEMPTS_PER_CANDIDATE);

    while (candidates.length < count && attempts < maxAttempts) {
      attempts += 1;
      const memberCount = minMembers + Math.floor(this.random() * (maxMembers - minMembers + 1));
      const spec = buildCandidate(shuffle(strategies, this.random).slice(0, memberCount), this.random);
      const key = canonicalSpec(spec);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(spec);
    }

    return candidates;
  }
}
