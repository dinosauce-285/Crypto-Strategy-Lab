import { canonicalJson } from '@csl/contracts';
import { InvalidSpecError, validateSpec } from './spec-validator';

const member = (weight: number) => ({
  id: 'ma',
  version: 1,
  params: { fastPeriod: 2, slowPeriod: 3 },
  paramsHash: canonicalJson({ fastPeriod: 2, slowPeriod: 3 }),
  weight,
});

describe('validateSpec', () => {
  it('accepts a single-member weighted candidate', () => {
    expect(
      validateSpec({
        rule: 'weighted',
        threshold: 0.3,
        members: [member(1)],
      }),
    ).toEqual({
      rule: 'weighted',
      threshold: 0.3,
      members: [member(1)],
    });
  });

  it('rejects a threshold on the wrong grid', () => {
    expect(() =>
      validateSpec({
        rule: 'weighted',
        threshold: 0.35,
        members: [member(1)],
      }),
    ).toThrow(InvalidSpecError);
  });

  it('rejects weights that do not sum to one', () => {
    expect(() =>
      validateSpec({
        rule: 'weighted',
        threshold: 0.3,
        members: [member(0.5), { ...member(0.4), id: 'rsi' }],
      }),
    ).toThrow('member weights sum to 0.9, not 1');
  });
});
