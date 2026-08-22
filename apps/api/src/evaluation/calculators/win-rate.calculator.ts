import type { Trade } from '@csl/contracts';

/**
 * Computes the win rate as winning trades / total trades in range [0, 1].
 * A trade is considered winning if profit > 0.
 */
export function computeWinRate(trades: readonly Trade[]): number {
  if (trades.length === 0) return 0;

  const wins = trades.filter((trade) => Number(trade.profit) > 0).length;
  return wins / trades.length;
}

/**
 * Returns total count of closed trades.
 */
export function computeTradeCount(trades: readonly Trade[]): number {
  return trades.length;
}
