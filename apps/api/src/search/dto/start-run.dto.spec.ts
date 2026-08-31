import { BOUND_CEILINGS } from '../run-bounds';
import { parseStartRun } from './start-run.dto';

describe('parseStartRun', () => {
  it('defaults to random search mode', () => {
    expect(
      parseStartRun({
        datasetId: 'dataset-1',
        strategyRefs: [{ id: 'ma', version: 1 }],
        bound: { maxCandidates: 10 },
      }).mode,
    ).toBe('random');
  });

  it('accepts domain-guided search mode', () => {
    expect(
      parseStartRun({
        datasetId: 'dataset-1',
        strategyRefs: [
          { id: 'ma', version: 1 },
          { id: 'rsi', version: 1 },
        ],
        mode: 'domain-guided',
        bound: { maxCandidates: 10 },
      }).mode,
    ).toBe('domain-guided');
  });

  it('rejects unknown search modes', () => {
    expect(() =>
      parseStartRun({
        datasetId: 'dataset-1',
        strategyRefs: [{ id: 'ma', version: 1 }],
        mode: 'bayesian',
        bound: { maxCandidates: 10 },
      }),
    ).toThrow('mode must be random or domain-guided');
  });

  it('rejects an empty strategy universe', () => {
    expect(() =>
      parseStartRun({
        datasetId: 'dataset-1',
        strategyRefs: [],
        bound: { maxCandidates: 10 },
      }),
    ).toThrow('strategyRefs must contain at least one strategy reference');
  });

  it('deduplicates selected strategy versions', () => {
    expect(
      parseStartRun({
        datasetId: 'dataset-1',
        strategyRefs: [
          { id: 'ma', version: 1 },
          { id: 'ma', version: 1 },
          { id: 'ma', version: 2 },
        ],
        bound: { maxCandidates: 10 },
      }).strategyRefs,
    ).toEqual([
      { id: 'ma', version: 1 },
      { id: 'ma', version: 2 },
    ]);
  });
});

describe('parseStartRun bound ceilings', () => {
  const run = (bound: Record<string, unknown>) =>
    parseStartRun({ datasetId: 'dataset-1', strategyRefs: [{ id: 'ma', version: 1 }], bound });

  it.each(['maxCandidates', 'maxDurationMs', 'noImprovementLimit'])(
    'refuses %s of 1e308, which is bounded only on paper',
    (field) => {
      expect(() => run({ [field]: 1e308 })).toThrow(`${field} must not exceed`);
    },
  );

  it('accepts a bound sitting exactly on the ceiling', () => {
    expect(run({ maxCandidates: BOUND_CEILINGS.maxCandidates }).bound.maxCandidates).toBe(
      BOUND_CEILINGS.maxCandidates,
    );
  });

  it('still refuses zero and still refuses a missing bound object', () => {
    expect(() => run({ maxCandidates: 0 })).toThrow('a bound must be a positive number');
  });
});
