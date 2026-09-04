import { Injectable } from '@nestjs/common';
import {
  canonicalSpec,
  type CandidateSpec,
  type RunHistory,
  type SearchMode,
  type StrategyRef,
  type StrategyMeta,
} from '@csl/contracts';
import { StrategyRegistry } from '../strategy/strategy.registry';
import { CandidateSource, InvalidSearchSpaceError } from './ports/candidate-source.port';
import type { CandidateGenerator } from './candidate-generator';
import { DomainGuidedCandidateGenerator } from './domain-guided-candidate.generator';
import { RandomCandidateGenerator } from './random-candidate.generator';
import { GeneticCandidateGenerator } from './genetic-candidate.generator';

@Injectable()
export class GeneratedCandidateSource extends CandidateSource {
  private readonly seen = new Set<string>();
  private readonly generators: Record<SearchMode, CandidateGenerator> = {
    random: new RandomCandidateGenerator(),
    'domain-guided': new DomainGuidedCandidateGenerator(),
    genetic: new GeneticCandidateGenerator(),
  };

  private mode: SearchMode = 'random';
  private strategies: StrategyMeta[] = [];

  constructor(private readonly registry: StrategyRegistry) {
    super();
  }

  reset(mode: SearchMode, strategyRefs: readonly StrategyRef[]): void {
    this.mode = mode;
    this.seen.clear();
    this.strategies = this.resolve(strategyRefs);
  }

  async next(history: RunHistory, count: number): Promise<CandidateSpec[]> {
    for (const candidate of history.candidates) {
      this.seen.add(canonicalSpec(candidate.spec));
    }
    return this.generators[this.mode].generate(this.strategies, history, count, this.seen);
  }

  private resolve(strategyRefs: readonly StrategyRef[]): StrategyMeta[] {
    const pairs = strategyRefs.map((ref): [StrategyRef, StrategyMeta | undefined] => [
      ref,
      this.registry.find(ref.id, ref.version)?.meta,
    ]);
    const missing = pairs.filter(([, meta]) => !meta).map(([ref]) => `${ref.id}@${ref.version}`);
    if (missing.length > 0) {
      throw new InvalidSearchSpaceError(`unknown strategy versions: ${missing.join(', ')}`);
    }
    return pairs.map(([, meta]) => meta).filter((meta): meta is StrategyMeta => Boolean(meta));
  }
}
