import { canonicalSpec, type CandidateSpec, type RunHistory, type StrategyMeta } from '@csl/contracts';
import { buildCandidate, choose, shuffle, type RandomFn } from './candidate-space';
import type { CandidateGenerator } from './candidate-generator';

const MAX_MEMBERS = 4;
const ATTEMPTS_PER_CANDIDATE = 40;
const POOL_SIZE = 4;

/**
 * Simplest thing that is honestly "genetic": no history yet -> same bootstrap as random
 * search. Once candidates have scores, breed from the current best-scoring pool instead
 * of the whole strategy universe -> crossover picks members from two parents, mutation
 * is re-rolling params/weights via buildCandidate's own randomisation.
 */
export class GeneticCandidateGenerator implements CandidateGenerator {
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

    const parents = [...history.candidates]
      .sort((a, b) => b.score - a.score)
      .slice(0, POOL_SIZE)
      .map((entry) => entry.spec);

    let attempts = 0;
    const maxAttempts = Math.max(ATTEMPTS_PER_CANDIDATE, count * ATTEMPTS_PER_CANDIDATE);

    while (candidates.length < count && attempts < maxAttempts) {
      attempts += 1;
      const metas = parents.length > 0 ? this.crossover(parents, strategies) : strategies;
      const memberCount = Math.min(
        metas.length,
        minMembers + Math.floor(this.random() * (maxMembers - minMembers + 1)),
      );
      if (memberCount === 0) continue;
      const spec = buildCandidate(shuffle(metas, this.random).slice(0, memberCount), this.random);
      const key = canonicalSpec(spec);
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push(spec);
    }

    return candidates;
  }

  /** The "genes" bred are which strategies get combined, taken from two parents' members. */
  private crossover(parents: readonly CandidateSpec[], strategies: readonly StrategyMeta[]): StrategyMeta[] {
    const a = choose(parents, this.random);
    const b = choose(parents, this.random);
    const pool = new Map<string, StrategyMeta>();
    for (const member of [...a.members, ...b.members]) {
      const meta = strategies.find((s) => s.id === member.id && s.version === member.version);
      if (meta) pool.set(`${meta.id}@${meta.version}`, meta);
    }
    return pool.size > 0 ? [...pool.values()] : [...strategies];
  }
}
