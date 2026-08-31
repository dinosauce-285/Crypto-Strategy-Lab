import type { RunCounters } from '@csl/contracts';
import { MAX_PAUSE_MS, leaseExpired, reachedBound, type BoundState } from './run-bounds';

const counters = (over: Partial<RunCounters> = {}): RunCounters => ({
  tried: 0,
  failed: 0,
  duplicates: 0,
  queued: 0,
  ...over,
});

const state = (over: Partial<BoundState> = {}): BoundState => ({
  bound: { maxDurationMs: 20_000 },
  counters: counters(),
  startedAt: 0,
  now: 0,
  pausedMs: 0,
  sinceImprovement: 0,
  sourceExhausted: false,
  ...over,
});

describe('reachedBound and paused time', () => {
  it('ends on duration when the whole budget was spent working', () => {
    expect(reachedBound(state({ now: 20_000 }))).toBe('duration');
  });

  it('does not end when the clock passed the budget but the run was paused for part of it', () => {
    expect(reachedBound(state({ now: 20_000, pausedMs: 12_000 }))).toBeNull();
  });

  it('ends once the active time reaches the budget, however long the pause was', () => {
    expect(reachedBound(state({ now: 32_000, pausedMs: 12_000 }))).toBe('duration');
  });

  it('leaves the candidate bound alone — it already counted work, not time', () => {
    const bound = { maxCandidates: 5 };
    expect(reachedBound(state({ bound, counters: counters({ tried: 5 }), pausedMs: 9_999 }))).toBe(
      'candidates',
    );
  });
});

describe('leaseExpired', () => {
  it('holds a pause shorter than the lease', () => {
    expect(leaseExpired(MAX_PAUSE_MS - 1)).toBe(false);
  });

  it('expires once the pause reaches the lease', () => {
    expect(leaseExpired(MAX_PAUSE_MS)).toBe(true);
  });
});
