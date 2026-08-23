import { SEARCH_MODES, type RunBound, type SearchMode } from '@csl/contracts';

export interface StartRunDto {
  datasetId: string;
  bound: RunBound;
  mode: SearchMode;
}

const optionalPositive = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError('a bound must be a positive number');
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
    mode: parseMode(source.mode),
    bound: {
      maxCandidates: optionalPositive(bound.maxCandidates),
      maxDurationMs: optionalPositive(bound.maxDurationMs),
      noImprovementLimit: optionalPositive(bound.noImprovementLimit),
    },
  };
}
