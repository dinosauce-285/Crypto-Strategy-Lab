import type { StrategyRegistration } from './strategy-registration';
import { bollingerStrategyRegistration } from './strategies/bollinger.strategy';
import { macdStrategyRegistration } from './strategies/macd.strategy';
import { macdV2StrategyRegistration } from './strategies/macd-v2.strategy';
import { maStrategyRegistration } from './strategies/ma.strategy';
import { rsiStrategyRegistration } from './strategies/rsi.strategy';
import { sentimentStrategyRegistration } from './strategies/sentiment.strategy';
import { supportResistanceStrategyRegistration } from './strategies/support-resistance.strategy';

export const registeredStrategies: readonly StrategyRegistration[] = [
  maStrategyRegistration,
  macdStrategyRegistration,
  macdV2StrategyRegistration,
  rsiStrategyRegistration,
  bollingerStrategyRegistration,
  supportResistanceStrategyRegistration,
  sentimentStrategyRegistration,
];
