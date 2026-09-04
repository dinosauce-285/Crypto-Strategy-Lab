import type { DataRequest, StrategyContext } from '@csl/contracts';
import { MACDStrategy } from './macd.strategy';
import { MACDStrategyV2, macdV2StrategyMeta } from './macd-v2.strategy';

const params = { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 };

// Hand-picked line/signal pairs, not derived from real candles — this spec is about the
// zero-line filter's branching, not indicator math (already covered by macd.calculator.spec.ts).
//                index:   0    1     2     3    4     5    6      7
const line   = [NaN, -0.5, -0.2, 0.3, 0.1, -0.3, 0.2, -0.4];
const signal = [NaN, -0.1, -0.1, 0.1, 0.2, -0.1, -0.05, 0.0];

describe('MACDStrategyV2', () => {
  it('describes itself as a distinct, coexisting version of "macd"', () => {
    expect(macdV2StrategyMeta).toMatchObject({
      id: 'macd',
      group: 'Trend',
      version: 2,
      warmup: 55,
    });
    expect(macdV2StrategyMeta.name).not.toBe('MACD Crossover');
  });

  it('declares the same MACD line and signal requests as v1', () => {
    const strategy = new MACDStrategyV2(params);
    expect(strategy.requires(params)).toEqual([
      { source: 'macd.line', params },
      { source: 'macd.signal', params },
    ]);
  });

  it('confirms a bullish cross that has already climbed above zero', () => {
    // index2 (below) -> index3 (above), and line[3] = 0.3 > 0
    const strategy = new MACDStrategyV2(params);
    expect(strategy.analyze(contextAt(3))).toEqual({ direction: 'BUY', strength: 1 });
  });

  it('holds a bearish cross that has not dropped below zero yet', () => {
    // index3 (above) -> index4 (below), but line[4] = 0.1 is still > 0: not confirmed
    const strategy = new MACDStrategyV2(params);
    expect(strategy.analyze(contextAt(4))).toEqual({ direction: 'HOLD', strength: 1 });
  });

  it('confirms a bearish cross that has already dropped below zero', () => {
    // index6 (above) -> index7 (below), and line[7] = -0.4 < 0
    const strategy = new MACDStrategyV2(params);
    expect(strategy.analyze(contextAt(7))).toEqual({ direction: 'SELL', strength: 1 });
  });

  it('differs from v1 on the exact same input at the unconfirmed crossing', () => {
    // Same context, same index — v1 has no zero-line filter and acts on the cross alone.
    const v1 = new MACDStrategy(params);
    const v2 = new MACDStrategyV2(params);

    expect(v1.analyze(contextAt(4)).direction).toBe('SELL');
    expect(v2.analyze(contextAt(4)).direction).toBe('HOLD');
  });
});

function contextAt(index: number): StrategyContext {
  return {
    candles: [],
    index,
    get(request: DataRequest): readonly number[] {
      if (request.source === 'macd.line') return line;
      if (request.source === 'macd.signal') return signal;
      throw new Error(`unexpected request ${request.source}`);
    },
  };
}
