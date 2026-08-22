import { Injectable } from '@nestjs/common';
import type { CandidateSpec } from '@csl/contracts';
import {
  StrategyFactory,
  UnknownStrategyError,
  type RunnableStrategy,
} from '../search/ports/strategy-factory.port';
import { WeightedRunnableStrategy } from './runnable-strategy';
import { StrategyRegistry } from './strategy.registry';

@Injectable()
export class StrategyFactoryService extends StrategyFactory {
  constructor(private readonly registry: StrategyRegistry) {
    super();
  }

  async build(spec: CandidateSpec): Promise<RunnableStrategy> {
    const members = spec.members.map((member) => {
      const registration = this.registry.find(member.id, member.version);
      if (!registration) throw new UnknownStrategyError(member.id);
      return {
        strategy: registration.create(member.params),
        params: member.params,
        weight: member.weight,
      };
    });
    return new WeightedRunnableStrategy(spec, members);
  }
}
