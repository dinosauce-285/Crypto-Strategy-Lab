import type { Candle, Trade } from '@csl/contracts';
import { computeMaxDrawdown } from './drawdown.calculator';

describe('drawdown.calculator', () => {
  it('computes trade-close max drawdown accurately', () => {
    // Sequence of trade returns: +50%, -20%, -25%, +40%
    // Peak equity path:
    // Start: 1.0 (peak: 1.0)
    // Trade 1 (+50%): 1.5 (peak: 1.5, dd: 0)
    // Trade 2 (-20%): 1.2 (peak: 1.5, dd: (1.5 - 1.2)/1.5 = 0.20)
    // Trade 3 (-25%): 0.9 (peak: 1.5, dd: (1.5 - 0.9)/1.5 = 0.40)
    // Trade 4 (+40%): 1.26 (peak: 1.5, dd: (1.5 - 1.26)/1.5 = 0.16)
    // Max drawdown = 0.40 (40%)
    const trades: Trade[] = [
      { entryTime: 1, entryPrice: '100', exitTime: 2, exitPrice: '150', side: 'BUY', profit: '0.50' },
      { entryTime: 3, entryPrice: '100', exitTime: 4, exitPrice: '80', side: 'BUY', profit: '-0.20' },
      { entryTime: 5, entryPrice: '100', exitTime: 6, exitPrice: '75', side: 'BUY', profit: '-0.25' },
      { entryTime: 7, entryPrice: '100', exitTime: 8, exitPrice: '140', side: 'BUY', profit: '0.40' },
    ];

    const mdd = computeMaxDrawdown(trades, 'trade-close', 'compound');
    expect(mdd).toBeCloseTo(0.40);
  });

  it('computes per-candle drawdown when adverse intra-candle wicks occur', () => {
    const trades: Trade[] = [
      { entryTime: 1000, entryPrice: '100', exitTime: 3000, exitPrice: '110', side: 'BUY', profit: '0.10' },
    ];

    // During the trade (entryPrice 100), candle 2 dips low to 70 before recovering to 110 at exit
    const candles: Candle[] = [
      { pair: 'BTCUSDT', timeframe: '1h', openTime: 1000, open: '100', high: '105', low: '95', close: '102', volume: '10', closed: true },
      { pair: 'BTCUSDT', timeframe: '1h', openTime: 2000, open: '102', high: '103', low: '70', close: '90', volume: '20', closed: true },
      { pair: 'BTCUSDT', timeframe: '1h', openTime: 3000, open: '90', high: '112', low: '88', close: '110', volume: '15', closed: true },
    ];

    const tradeCloseMdd = computeMaxDrawdown(trades, 'trade-close', 'compound');
    expect(tradeCloseMdd).toBe(0); // At trade close, it was in profit (+10%)

    const perCandleMdd = computeMaxDrawdown(trades, 'per-candle', 'compound', candles);
    // Adverse dip: (70 - 100)/100 = -30% drawdown
    expect(perCandleMdd).toBeCloseTo(0.30);
  });

  it('returns 0 for empty trades', () => {
    expect(computeMaxDrawdown([], 'trade-close')).toBe(0);
    expect(computeMaxDrawdown([], 'per-candle')).toBe(0);
  });
});
