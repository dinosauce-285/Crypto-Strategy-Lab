import { parseStartRun } from './start-run.dto';

describe('parseStartRun', () => {
  it('defaults to random search mode', () => {
    expect(parseStartRun({ datasetId: 'dataset-1', bound: { maxCandidates: 10 } }).mode).toBe('random');
  });

  it('accepts domain-guided search mode', () => {
    expect(
      parseStartRun({
        datasetId: 'dataset-1',
        mode: 'domain-guided',
        bound: { maxCandidates: 10 },
      }).mode,
    ).toBe('domain-guided');
  });

  it('rejects unknown search modes', () => {
    expect(() =>
      parseStartRun({
        datasetId: 'dataset-1',
        mode: 'bayesian',
        bound: { maxCandidates: 10 },
      }),
    ).toThrow('mode must be random or domain-guided');
  });
});
