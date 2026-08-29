import type { Trade } from '@csl/contracts';
import { calculateTradeReturn, computeProfitLoss, computeTotalReturn } from './return.calculator';

describe('return.calculator', () => {
  const sampleTrades: Trade[] = [
    {
      entryTime: 1000,
      entryPrice: '100',
      exitTime: 2000,
      exitPrice: '110',
      side: 'BUY',
      profit: '0.1',
    },
    {
      entryTime: 3000,
      entryPrice: '110',
      exitTime: 4000,
      exitPrice: '99',
      side: 'BUY',
      profit: '-0.1',
    },
  ];

  it('calculates trade return correctly for BUY and SELL with net profit accounting for fees', () => {
    const buyTradeWithFee: Trade = {
      entryTime: 1000,
      entryPrice: '100',
      exitTime: 2000,
      exitPrice: '120',
      side: 'BUY',
      profit: '0.198', // 0.20 - 0.002 fee
    };
    expect(calculateTradeReturn(buyTradeWithFee)).toBeCloseTo(0.198);

    const fallbackTrade: Trade = {
      entryTime: 1000,
      entryPrice: '100',
      exitTime: 2000,
      exitPrice: '90',
      side: 'SELL',
      profit: '',
    };
    expect(calculateTradeReturn(fallbackTrade)).toBeCloseTo(0.1);
  });

  it('computes simple total return as linear sum of trade returns', () => {
    // 0.1 + (-0.1) = 0
    expect(computeTotalReturn(sampleTrades, 'simple')).toBeCloseTo(0);
  });

  it('computes compound total return as geometric growth', () => {
    // (1 + 0.1) * (1 - 0.1) - 1 = 1.1 * 0.9 - 1 = 0.99 - 1 = -0.01
    expect(computeTotalReturn(sampleTrades, 'compound')).toBeCloseTo(-0.01);
  });

  it('computes exact profit/loss sum matching net returns', () => {
    expect(computeProfitLoss(sampleTrades)).toBe('0');
  });

  it('handles empty trade list safely', () => {
    expect(computeTotalReturn([], 'simple')).toBe(0);
    expect(computeTotalReturn([], 'compound')).toBe(0);
    expect(computeProfitLoss([])).toBe('0');
  });
});
