import type { Trade } from '@csl/contracts';
import { computeProfitFactor, computeSharpeRatio } from './risk-metrics.calculator';

describe('risk-metrics.calculator', () => {
  it('computes profit factor as gross profits / gross losses', () => {
    const trades: Trade[] = [
      { entryTime: 1, entryPrice: '100', exitTime: 2, exitPrice: '120', side: 'BUY', profit: '20' },
      { entryTime: 3, entryPrice: '100', exitTime: 4, exitPrice: '90', side: 'BUY', profit: '-10' },
      { entryTime: 5, entryPrice: '100', exitTime: 6, exitPrice: '110', side: 'BUY', profit: '10' },
    ];
    // Gross profits: 20 + 10 = 30. Gross losses: 10. Profit factor = 3.0
    expect(computeProfitFactor(trades)).toBeCloseTo(3.0);
  });

  it('returns undefined for profit factor when no losses exist', () => {
    const allWins: Trade[] = [
      { entryTime: 1, entryPrice: '100', exitTime: 2, exitPrice: '120', side: 'BUY', profit: '20' },
    ];
    expect(computeProfitFactor(allWins)).toBeUndefined();
  });

  it('computes Sharpe Ratio correctly for series of returns', () => {
    const trades: Trade[] = [
      { entryTime: 1, entryPrice: '100', exitTime: 2, exitPrice: '110', side: 'BUY', profit: '10' }, // +10%
      { entryTime: 3, entryPrice: '100', exitTime: 4, exitPrice: '120', side: 'BUY', profit: '20' }, // +20%
      { entryTime: 5, entryPrice: '100', exitTime: 6, exitPrice: '90', side: 'BUY', profit: '-10' }, // -10%
    ];
    // Returns: 0.1, 0.2, -0.1. Mean: 0.0667
    const sharpe = computeSharpeRatio(trades);
    expect(sharpe).toBeDefined();
    expect(sharpe).toBeGreaterThan(0);
  });

  it('returns undefined for Sharpe Ratio when trade count < 2 or variance is 0', () => {
    expect(computeSharpeRatio([])).toBeUndefined();

    const singleTrade: Trade[] = [
      { entryTime: 1, entryPrice: '100', exitTime: 2, exitPrice: '110', side: 'BUY', profit: '10' },
    ];
    expect(computeSharpeRatio(singleTrade)).toBeUndefined();

    const identicalTrades: Trade[] = [
      { entryTime: 1, entryPrice: '100', exitTime: 2, exitPrice: '110', side: 'BUY', profit: '10' }, // +10%
      { entryTime: 3, entryPrice: '100', exitTime: 4, exitPrice: '110', side: 'BUY', profit: '10' }, // +10%
    ];
    expect(computeSharpeRatio(identicalTrades)).toBeUndefined();
  });
});
