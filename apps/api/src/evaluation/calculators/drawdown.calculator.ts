import type { Candle, DrawdownMode, ProfitMode, Trade } from '@csl/contracts';
import { calculateTradeReturn } from './return.calculator';

/**
 * Computes maximum drawdown as a fraction in range [0, 1].
 * - trade-close: evaluated along discrete trade close equity points.
 * - per-candle: evaluated across adverse intra-candle price movements during active trades.
 */
export function computeMaxDrawdown(
  trades: readonly Trade[],
  drawdownMode: DrawdownMode,
  profitMode: ProfitMode = 'compound',
  candles?: readonly Candle[],
): number {
  if (trades.length === 0) return 0;

  if (drawdownMode === 'per-candle' && candles && candles.length > 0) {
    return computePerCandleDrawdown(trades, candles, profitMode);
  }

  return computeTradeCloseDrawdown(trades, profitMode);
}

function computeTradeCloseDrawdown(trades: readonly Trade[], profitMode: ProfitMode): number {
  let equity = 1.0;
  let peak = 1.0;
  let maxDd = 0.0;

  for (const trade of trades) {
    const r = calculateTradeReturn(trade);
    if (profitMode === 'simple') {
      equity += r;
    } else {
      equity *= (1.0 + r);
    }

    if (equity > peak) {
      peak = equity;
    }

    if (peak > 0) {
      const dd = (peak - equity) / peak;
      if (dd > maxDd) {
        maxDd = dd;
      }
    }
  }

  return Math.max(0, Math.min(1, maxDd));
}

function computePerCandleDrawdown(
  trades: readonly Trade[],
  candles: readonly Candle[],
  profitMode: ProfitMode,
): number {
  let equity = 1.0;
  let peak = 1.0;
  let maxDd = 0.0;

  // Map candles by time range for active trades
  for (const trade of trades) {
    const entryPrice = Number(trade.entryPrice);
    if (entryPrice <= 0) continue;

    // Find candles during this trade holding window
    const tradeCandles = candles.filter(
      (c) => c.openTime >= trade.entryTime && c.openTime <= trade.exitTime,
    );

    for (const c of tradeCandles) {
      // Adverse price movement during candle: low for BUY, high for SELL
      const adversePrice = trade.side === 'BUY' ? Number(c.low) : Number(c.high);
      const adverseReturn = trade.side === 'BUY'
        ? (adversePrice - entryPrice) / entryPrice
        : (entryPrice - adversePrice) / entryPrice;

      const candleEquity = profitMode === 'simple'
        ? equity + adverseReturn
        : equity * (1.0 + adverseReturn);

      if (candleEquity > peak) {
        peak = candleEquity;
      }

      if (peak > 0) {
        const dd = (peak - candleEquity) / peak;
        if (dd > maxDd) {
          maxDd = dd;
        }
      }
    }

    // Advance realized equity upon trade completion
    const realizedReturn = calculateTradeReturn(trade);
    equity = profitMode === 'simple' ? equity + realizedReturn : equity * (1.0 + realizedReturn);
    if (equity > peak) peak = equity;
  }

  return Math.max(0, Math.min(1, maxDd));
}
