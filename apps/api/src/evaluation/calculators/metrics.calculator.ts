import type { BacktestRules, Candle, Metrics, Trade } from '@csl/contracts';
import { computeProfitLoss, computeTotalReturn } from './return.calculator';
import { computeTradeCount, computeWinRate } from './win-rate.calculator';
import { computeMaxDrawdown } from './drawdown.calculator';
import { computeProfitFactor, computeSharpeRatio } from './risk-metrics.calculator';

/**
 * Turns a list of trades into the 7 standard performance metrics according to dataset rules.
 */
export function evaluateTrades(
  trades: readonly Trade[],
  rules: BacktestRules,
  candles?: readonly Candle[],
): Metrics {
  const totalReturn = computeTotalReturn(trades, rules.profitMode);
  const profitLoss = computeProfitLoss(trades);
  const winRate = computeWinRate(trades);
  const tradeCount = computeTradeCount(trades);
  const maxDrawdown = computeMaxDrawdown(trades, rules.drawdownMode, rules.profitMode, candles);
  const profitFactor = computeProfitFactor(trades);
  const sharpeRatio = computeSharpeRatio(trades);

  return {
    totalReturn,
    profitLoss,
    winRate,
    tradeCount,
    maxDrawdown,
    ...(profitFactor !== undefined ? { profitFactor } : {}),
    ...(sharpeRatio !== undefined ? { sharpeRatio } : {}),
  };
}
