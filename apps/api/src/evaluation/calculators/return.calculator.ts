import type { ProfitMode, Trade } from '@csl/contracts';

/**
 * Calculates individual net trade return percentage:
 * - Reads `trade.profit` (which accounts for trade return minus fees).
 * - Fallback to raw price return `(exitPrice - entryPrice) / entryPrice` if profit is absent.
 */
export function calculateTradeReturn(trade: Trade): number {
  if (trade.profit !== undefined && trade.profit !== null && trade.profit !== '') {
    const p = Number(trade.profit);
    if (Number.isFinite(p)) {
      return p;
    }
  }

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
 * Computes cumulative linear trade return (fractional sum of all trade returns) as a decimal string.
 * Since position sizing is not specified, this represents total uncompounded strategy return.
 */
export function computeProfitLoss(trades: readonly Trade[]): string {
  if (trades.length === 0) return '0';

  let total = 0;
  for (const trade of trades) {
    total += calculateTradeReturn(trade);
  }
  // Remove floating-point artifacts while preserving exact precision
  const rounded = Number(total.toFixed(8));
  return String(rounded);
}
