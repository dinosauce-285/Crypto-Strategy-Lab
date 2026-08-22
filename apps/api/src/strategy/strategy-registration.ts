import type { Strategy, StrategyMeta, StrategyParams } from '@csl/contracts';

export interface StrategyRegistration {
  readonly meta: StrategyMeta;
  create(params: StrategyParams): Strategy;
}

