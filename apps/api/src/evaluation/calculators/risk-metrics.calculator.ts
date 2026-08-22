import type { Trade } from '@csl/contracts';
import { calculateTradeReturn } from './return.calculator';

/**
 * Computes Profit Factor: gross profits / gross losses.
 * Returns undefined if no losing trades exist (0 losses).
 */
export function computeProfitFactor(trades: readonly Trade[]): number | undefined {
  if (trades.length === 0) return undefined;

  let grossProfit = 0;
  let grossLoss = 0;

  for (const trade of trades) {
    const profit = Number(trade.profit);
    if (profit > 0) {
      grossProfit += profit;
    } else if (profit < 0) {
      grossLoss += Math.abs(profit);
    }
  }

  if (grossLoss === 0) {
    return undefined;
  }

  return grossProfit / grossLoss;
}

/**
 * Computes sample Sharpe Ratio: mean trade return / standard deviation of trade returns.
 * Returns undefined if trade count < 2 or variance is 0.
 */
export function computeSharpeRatio(trades: readonly Trade[]): number | undefined {
  if (trades.length < 2) return undefined;

  const returns = trades.map(calculateTradeReturn);
  const n = returns.length;
  const mean = returns.reduce((sum, r) => sum + r, 0) / n;

  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (n - 1);
  if (variance <= 0) return undefined;

  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return undefined;

  return mean / stdDev;
}
