import type { Trade } from '@csl/contracts';
import { computeTradeCount, computeWinRate } from './win-rate.calculator';

describe('win-rate.calculator', () => {
  const trades: Trade[] = [
    { entryTime: 1, entryPrice: '10', exitTime: 2, exitPrice: '12', side: 'BUY', profit: '2' },
    { entryTime: 3, entryPrice: '12', exitTime: 4, exitPrice: '11', side: 'BUY', profit: '-1' },
    { entryTime: 5, entryPrice: '11', exitTime: 6, exitPrice: '14', side: 'BUY', profit: '3' },
    { entryTime: 7, entryPrice: '14', exitTime: 8, exitPrice: '14', side: 'BUY', profit: '0' },
  ];

  it('computes win rate as winning trades / total trades', () => {
    // 2 wins out of 4 trades = 0.5
    expect(computeWinRate(trades)).toBe(0.5);
    expect(computeTradeCount(trades)).toBe(4);
  });

  it('handles empty trades list', () => {
    expect(computeWinRate([])).toBe(0);
    expect(computeTradeCount([])).toBe(0);
  });

  it('handles 100% win rate', () => {
    const allWins = [trades[0], trades[2]];
    expect(computeWinRate(allWins)).toBe(1.0);
  });

  it('handles 0% win rate', () => {
    const allLosses = [trades[1]];
    expect(computeWinRate(allLosses)).toBe(0.0);
  });
});
