import type { CandidateSpec, Metrics } from '@csl/contracts';
import { ActiveRun } from './active-run';

const metrics = (totalReturn: number): Metrics => ({
  totalReturn,
  profitLoss: totalReturn.toString(),
  winRate: 0,
  tradeCount: 0,
  maxDrawdown: 0,
});

const spec = (period: number): CandidateSpec => ({
  rule: 'weighted',
  threshold: 0.3,
  members: [
    {
      id: 'ma',
      version: 1,
      params: { period },
      paramsHash: period.toString(),
      weight: 1,
    },
  ],
});

describe('ActiveRun history', () => {
  it('keeps a bounded top-scoring view for generators', () => {
    const run = new ActiveRun('dataset-1', [{ id: 'ma', version: 1 }], { maxCandidates: 30 }, 'random');

    for (let index = 0; index < 30; index += 1) {
      run.recordFinished(
        {
          status: 'completed',
          specHash: `hash-${index}`,
          datasetId: 'dataset-1',
          experimentId: `experiment-${index}`,
          metrics: metrics(index),
          durationMs: 10,
        },
        spec(index),
      );
    }

    const history = run.history();
    expect(history.tried).toBe(30);
    expect(history.candidates).toHaveLength(25);
    expect(history.candidates[0].score).toBe(29);
    expect(history.candidates[24].score).toBe(5);
  });
});
