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

describe('ActiveRun current candidate', () => {
  const candidate = (period: number) => ({ spec: spec(period), specHash: `hash-${period}` });

  const run = () =>
    new ActiveRun('dataset-1', [{ id: 'ma', version: 1 }], { maxCandidates: 30 }, 'random');

  it('reports nothing before a worker picks anything up', () => {
    expect(run().status().current).toBeUndefined();
  });

  it('names the candidate a worker is holding', () => {
    const active = run();
    active.recordStarted('job-1', candidate(20));
    expect(active.status().current?.specHash).toBe('hash-20');
  });

  it('drops it when that job comes back', () => {
    const active = run();
    active.recordStarted('job-1', candidate(20));
    active.recordSettled('job-1');
    expect(active.status().current).toBeUndefined();
  });

  it('keeps the latest when another worker finishes first', () => {
    const active = run();
    active.recordStarted('job-1', candidate(20));
    active.recordStarted('job-2', candidate(50));
    active.recordSettled('job-1');
    expect(active.status().current?.specHash).toBe('hash-50');
  });

  it('reports nothing once the run has ended', () => {
    const active = run();
    active.recordStarted('job-1', candidate(20));
    active.end('stopped');
    expect(active.status().current).toBeUndefined();
  });
});

describe('ActiveRun pause accounting', () => {
  const run = () =>
    new ActiveRun('dataset-1', [{ id: 'ma', version: 1 }], { maxDurationMs: 20_000 }, 'random');

  it('counts nothing before the first pause', () => {
    expect(run().pausedMs(Date.now() + 5_000)).toBe(0);
  });

  it('counts the pause it is still inside', () => {
    const active = run();
    active.pause(1_000);
    expect(active.pausedMs(9_000)).toBe(8_000);
    expect(active.currentPauseMs(9_000)).toBe(8_000);
  });

  it('accumulates across several pauses and stops counting once resumed', () => {
    const active = run();
    active.pause(1_000);
    active.resume(4_000);
    active.pause(10_000);
    active.resume(12_000);

    expect(active.pausedMs(60_000)).toBe(5_000);
    expect(active.currentPauseMs(60_000)).toBe(0);
  });
});
