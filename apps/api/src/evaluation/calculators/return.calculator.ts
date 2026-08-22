import type { ProfitMode, Trade } from '@csl/contracts';

/**
 * Calculates individual trade return percentage:
 * r_i = (exitPrice - entryPrice) / entryPrice for BUY
 * r_i = (entryPrice - exitPrice) / entryPrice for SELL
 */
export function calculateTradeReturn(trade: Trade): number {
  const entry = Number(trade.entryPrice);
  const exit = Number(trade.exitPrice);
  if (entry <= 0) return 0;

  const rawReturn = (exit - entry) / entry;
  return trade.side === 'BUY' ? rawReturn : -rawReturn;
}

/**
 * Computes total return:
 * - simple: sum of trade returns
 * - compound: product of (1 + trade return) - 1
 */
export function computeTotalReturn(trades: readonly Trade[], profitMode: ProfitMode): number {
  if (trades.length === 0) return 0;

  if (profitMode === 'simple') {
    return trades.reduce((acc, trade) => acc + calculateTradeReturn(trade), 0);
  }

  // compound
  let equity = 1.0;
  for (const trade of trades) {
    const r = calculateTradeReturn(trade);
    equity *= (1.0 + r);
  }
  return equity - 1.0;
}

/**
 * Computes exact cumulative quote currency profit/loss as a decimal string.
 */
export function computeProfitLoss(trades: readonly Trade[]): string {
  if (trades.length === 0) return '0';

  let total = 0;
  for (const trade of trades) {
    total += Number(trade.profit);
  }
  // Remove floating-point artifacts while preserving exact precision
  const rounded = Number(total.toFixed(8));
  return String(rounded);
}
