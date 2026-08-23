import { Injectable } from '@nestjs/common';
import { canonicalSpec, type CandidateSpec, type RunHistory, type SearchMode } from '@csl/contracts';
import { StrategyRegistry } from '../strategy/strategy.registry';
import { CandidateSource } from './ports/candidate-source.port';
import type { CandidateGenerator } from './candidate-generator';
import { DomainGuidedCandidateGenerator } from './domain-guided-candidate.generator';
import { RandomCandidateGenerator } from './random-candidate.generator';

@Injectable()
export class GeneratedCandidateSource extends CandidateSource {
  private readonly seen = new Set<string>();
  private readonly generators: Record<SearchMode, CandidateGenerator> = {
    random: new RandomCandidateGenerator(),
    'domain-guided': new DomainGuidedCandidateGenerator(),
  };

  private mode: SearchMode = 'random';

  constructor(private readonly registry: StrategyRegistry) {
    super();
  }

  reset(mode: SearchMode): void {
    this.mode = mode;
    this.seen.clear();
  }

  async next(history: RunHistory, count: number): Promise<CandidateSpec[]> {
    for (const candidate of history.candidates) {
      this.seen.add(canonicalSpec(candidate.spec));
    }
    return this.generators[this.mode].generate(this.registry.list(), history, count, this.seen);
  }
}
