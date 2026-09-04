import type { CandidateSpec, CandidateMember } from './candidate';

/**
 * What bounds a run, handed over when it starts — `0021`. At least one of the first two
 * is required and a request carrying neither is refused, which is what makes "this system
 * cannot run an unbounded search" a property of the API rather than a habit.
 */
export interface RunBound {
  maxCandidates?: number;
  /** Active time: milliseconds spent paused are subtracted before this is checked — `0045`. */
  maxDurationMs?: number;
  /**
   * Consecutive finished candidates allowed to fail to beat the best so far. Optional
   * because it is the only bound that depends on results being comparable, and today
   * they are compared on total return rather than on a settled score.
   */
  noImprovementLimit?: number;
}

/** One registered strategy version that is allowed to enter one search run. */
export interface StrategyRef {
  id: string;
  version: number;
}

/** The registry entries that are allowed to enter one search run. */
export interface SearchSpace {
  strategyRefs: StrategyRef[];
}

export const RUN_STATES = ['running', 'paused', 'ended'] as const;
export type RunState = (typeof RUN_STATES)[number];

/**
 * Why a run ended. A run that reports only "not running" cannot be told apart from one
 * that died, and section 32.7 asks whether the loop is running.
 *
 * `abandoned` is a run left paused past its lease — nobody's decision, unlike `stopped`
 * (ADR 0045).
 */
export const RUN_END_REASONS = [
  'candidates',
  'duration',
  'plateau',
  'exhausted',
  'stopped',
  'abandoned',
] as const;
export type RunEndReason = (typeof RUN_END_REASONS)[number];

/** The leader of a run, by total return. Not the leaderboard's ranking, which is a read — `0011`. */
export interface RunBest {
  experimentId: string;
  specHash: string;
  totalReturn: number;
}

export const SEARCH_MODES = ['random', 'domain-guided', 'genetic'] as const;
export type SearchMode = (typeof SEARCH_MODES)[number];

/**
 * The five questions of section 32.7, in the order they are asked: is it running, how
 * many were tried, how long does a backtest take, how many failed, who is top.
 *
 * `tried` counts every candidate that came back, whatever it came back as; `failed` and
 * `duplicates` are subsets of it. A candidate bound that counted only successes would
 * never be reached by a run where everything fails, which is an unbounded loop wearing
 * the clothes of a bounded one — `0021`.
 */
export interface RunCounters {
  tried: number;
  failed: number;
  duplicates: number;
  queued: number;
  /** Absent until a candidate has finished, rather than zero, which would read as instant. */
  averageBacktestMs?: number;
  best?: RunBest;
}

/**
 * What a worker is testing at this instant — section 46 step 4 asks the screen to name it.
 * With several workers this is the most recently started of them, not the only one.
 */
export interface RunningCandidate {
  spec: CandidateSpec;
  specHash: string;
}

export interface RunStatus {
  runId: string;
  datasetId: string;
  strategyRefs: StrategyRef[];
  mode: SearchMode;
  state: RunState;
  bound: RunBound;
  startedAt: number;
  endedAt?: number;
  endReason?: RunEndReason;
  /** Absent between candidates — `state` says whether the run is still going. */
  current?: RunningCandidate;
  counters: RunCounters;
}

export interface SearchHistoryEntry {
  spec: CandidateSpec;
  specHash: string;
  score: number;
}

/** What the generator is handed — `0013`. A bounded view, not every candidate ever tested. */
export interface RunHistory {
  tried: number;
  candidates: SearchHistoryEntry[];
  best?: RunBest;
}

/**
 * How many decimal places a number is rounded to before it is hashed — `0009`. Chosen
 * against the parameters that exist: weights and the threshold sit on a grid of 0.1, and
 * nothing declares a parameter finer than a thousandth.
 */
export const HASH_DECIMALS = 6;

const roundForHash = (value: number): number => Number(value.toFixed(HASH_DECIMALS));

const canonicalValue = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (typeof value === 'number') return roundForHash(value);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]): [string, unknown] => [k, canonicalValue(v)]);
  return Object.fromEntries(entries);
};

const compareMembers = (a: CandidateMember, b: CandidateMember): number =>
  a.id.localeCompare(b.id) || a.version - b.version || a.paramsHash.localeCompare(b.paramsHash);

/**
 * Any value in the canonical form of `0009`: keys sorted, absent optionals left out,
 * numbers rounded. Used directly only for something that failed to be a specification and
 * still has to be identified well enough to be recorded.
 */
export const canonicalJson = (value: unknown): string =>
  JSON.stringify(canonicalValue(value)) ?? 'null';

/**
 * The string a specification is identified by — `0009`. Hashing it is a separate step and
 * happens on the server, so nothing here pulls a cryptographic library into the browser.
 *
 * Two spellings of one candidate must produce one string, or the search re-tests
 * combinations it has already seen and the leaderboard fills with duplicates.
 */
export function canonicalSpec(spec: CandidateSpec): string {
  return canonicalJson({
    rule: spec.rule,
    threshold: spec.threshold,
    members: [...spec.members].sort(compareMembers),
  });
}
