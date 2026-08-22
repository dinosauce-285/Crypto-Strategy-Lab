import type { StrategyRegistration } from './strategy-registration';
import { maStrategyRegistration } from './strategies/ma.strategy';

export const registeredStrategies: readonly StrategyRegistration[] = [
  maStrategyRegistration,
];

