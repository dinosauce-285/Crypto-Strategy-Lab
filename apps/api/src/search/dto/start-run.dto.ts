import { SEARCH_MODES, type RunBound, type SearchMode, type StrategyRef } from '@csl/contracts';
import { BOUND_CEILINGS } from '../run-bounds';

export interface StartRunDto {
  datasetId: string;
  strategyRefs: StrategyRef[];
  bound: RunBound;
  mode: SearchMode;
}

const optionalPositive = (value: unknown, name: keyof typeof BOUND_CEILINGS): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError('a bound must be a positive number');
  }
  const ceiling = BOUND_CEILINGS[name];
  if (value > ceiling) {
    throw new TypeError(`${name} must not exceed ${ceiling} — see docs/decisions/0021`);
  }
  return value;
};

const parseMode = (value: unknown): SearchMode => {
  if (value === undefined || value === null) return 'random';
  if (typeof value === 'string' && isSearchMode(value)) return value;
  throw new TypeError('mode must be random or domain-guided');
};

const isSearchMode = (value: string): value is SearchMode =>
  SEARCH_MODES.some((mode: SearchMode) => mode === value);

const strategyRefKey = (ref: StrategyRef): string => `${ref.id}@${ref.version}`;

const parseStrategyRefs = (value: unknown): StrategyRef[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError('strategyRefs must contain at least one strategy reference');
  }
  const refs = value.map((item) => {
    const source = (item ?? {}) as Record<string, unknown>;
    const id = source.id;
    const version = source.version;
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new TypeError('strategyRefs must contain non-empty ids');
    }
    if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
      throw new TypeError('strategyRefs must contain positive integer versions');
    }
    return { id: id.trim(), version };
  });

  const byKey = new Map(refs.map((ref) => [strategyRefKey(ref), ref]));
  return [...byKey.values()];
};

/** The queue is never reached by a request that failed here — ADR 0021. */
export function parseStartRun(body: unknown): StartRunDto {
  const source = (body ?? {}) as Record<string, unknown>;
  const datasetId = source.datasetId;
  if (typeof datasetId !== 'string' || datasetId.length === 0) {
    throw new TypeError('datasetId is required');
  }
  const bound = (source.bound ?? {}) as Record<string, unknown>;
  return {
    datasetId,
    strategyRefs: parseStrategyRefs(source.strategyRefs),
    mode: parseMode(source.mode),
    bound: {
      maxCandidates: optionalPositive(bound.maxCandidates, 'maxCandidates'),
      maxDurationMs: optionalPositive(bound.maxDurationMs, 'maxDurationMs'),
      noImprovementLimit: optionalPositive(bound.noImprovementLimit, 'noImprovementLimit'),
    },
  };
}
