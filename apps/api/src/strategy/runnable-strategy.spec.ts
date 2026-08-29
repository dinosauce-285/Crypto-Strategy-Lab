import type { CandidateSpec, DataRequest, Signal, Strategy, StrategyContext, StrategyParams } from '@csl/contracts';
import { WeightedRunnableStrategy, type RunnableMember } from './runnable-strategy';

describe('WeightedRunnableStrategy', () => {
  it('returns the union of member requirements', () => {
    const strategy = buildComposite([
      member('trend', 0.6, [{ source: 'ma', params: { period: 20 } }], { direction: 'BUY', strength: 1 }),
      member('momentum', 0.4, [{ source: 'ma', params: { period: 20 } }, { source: 'rsi', params: { period: 14 } }], {
        direction: 'SELL',
        strength: 0.5,
      }),
    ]);

    expect(strategy.requires()).toEqual([
      { source: 'ma', params: { period: 20 } },
      { source: 'rsi', params: { period: 14 } },
    ]);
  });

  it('rounds the weighted score before strict threshold comparison', () => {
    const strategy = buildComposite([
      member('buy', 0.5, [], { direction: 'BUY', strength: 1 }),
      member('sell', 0.2, [], { direction: 'SELL', strength: 1 }),
      member('hold', 0.3, [], { direction: 'HOLD', strength: 1 }),
    ]);

    expect(strategy.analyze(context())).toEqual({ direction: 'HOLD', strength: 0.3 });
  });

  it('acts on the score sign and uses the absolute score as strength', () => {
    const buy = buildComposite([
      member('trend', 0.6, [], { direction: 'BUY', strength: 1 }),
      member('momentum', 0.4, [], { direction: 'SELL', strength: 0.25 }),
    ]);
    const sell = buildComposite([
      member('trend', 0.6, [], { direction: 'SELL', strength: 1 }),
      member('momentum', 0.4, [], { direction: 'BUY', strength: 0.25 }),
    ]);

    expect(buy.analyze(context())).toEqual({ direction: 'BUY', strength: 0.5 });
    expect(sell.analyze(context())).toEqual({ direction: 'SELL', strength: 0.5 });
  });
});

function buildComposite(members: readonly RunnableMember[]): WeightedRunnableStrategy {
  const spec: CandidateSpec = {
    rule: 'weighted',
    threshold: 0.3,
    members: members.map((candidate) => ({
      id: candidate.strategy.meta.id,
      version: candidate.strategy.meta.version,
      params: candidate.params,
      paramsHash: candidate.strategy.meta.id,
      weight: candidate.weight,
    })),
  };
  return new WeightedRunnableStrategy(spec, members);
}

function member(
  id: string,
  weight: number,
  requests: DataRequest[],
  signal: Signal,
): RunnableMember {
  return {
    strategy: fixedStrategy(id, requests, signal),
    params: {},
    weight,
  };
}

function fixedStrategy(id: string, requests: DataRequest[], signal: Signal): Strategy {
  return {
    meta: { id, name: id, group: 'Trend', version: 1, warmup: 0, params: [] },
    requires: (_params: StrategyParams) => requests,
    analyze: (_context: StrategyContext) => signal,
  };
}

function context(): StrategyContext {
  return {
    candles: [],
    index: 0,
    get: () => [],
  };
}
