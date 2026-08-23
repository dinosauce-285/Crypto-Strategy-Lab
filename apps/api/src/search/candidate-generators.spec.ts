import { canonicalSpec, type RunHistory, type StrategyMeta } from '@csl/contracts';
import { validateSpec } from './spec-validator';
import { DomainGuidedCandidateGenerator } from './domain-guided-candidate.generator';
import { RandomCandidateGenerator } from './random-candidate.generator';

const history: RunHistory = { tried: 0, candidates: [] };

const meta = (id: string, group: StrategyMeta['group']): StrategyMeta => ({
  id,
  name: id,
  group,
  version: 1,
  warmup: 1,
  params: [{ name: 'period', type: 'int', min: 2, max: 4, step: 1, default: 3 }],
});

describe('candidate generators', () => {
  it('builds domain-guided candidates from trend, momentum, and one context group', () => {
    const generator = new DomainGuidedCandidateGenerator(() => 0);
    const candidates = generator.generate(
      [
        meta('ma', 'Trend'),
        meta('rsi', 'Momentum'),
        meta('support-resistance', 'Structure'),
        meta('bollinger', 'Volatility'),
      ],
      history,
      1,
      new Set(),
    );

    expect(candidates).toHaveLength(1);
    expect(candidates[0].members.map((member) => member.id)).toEqual([
      'ma',
      'rsi',
      'support-resistance',
    ]);
    expect(candidates[0].members.map((member) => member.weight)).toEqual([0.4, 0.3, 0.3]);
    expect(validateSpec(candidates[0])).toEqual(candidates[0]);
  });

  it('allows information strategies to enter the guided context slot', () => {
    const generator = new DomainGuidedCandidateGenerator(() => 0);
    const candidates = generator.generate(
      [meta('ma', 'Trend'), meta('rsi', 'Momentum'), meta('sentiment', 'Information')],
      history,
      1,
      new Set(),
    );

    expect(candidates[0].members.map((member) => member.id)).toEqual(['ma', 'rsi', 'sentiment']);
  });

  it('stops trying when random draws only duplicates', () => {
    const generator = new RandomCandidateGenerator(() => 0);
    const strategies = [meta('ma', 'Trend'), meta('rsi', 'Momentum')];
    const first = generator.generate(strategies, history, 1, new Set());
    const seen = new Set(first.map(canonicalSpec));

    expect(generator.generate(strategies, history, 1, seen)).toEqual([]);
  });
});
