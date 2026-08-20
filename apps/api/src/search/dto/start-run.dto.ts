import type { RunBound } from '@csl/contracts';

export interface StartRunDto {
  datasetId: string;
  bound: RunBound;
}

const optionalPositive = (value: unknown): number | undefined => {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new TypeError('a bound must be a positive number');
  }
  return value;
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
    bound: {
      maxCandidates: optionalPositive(bound.maxCandidates),
      maxDurationMs: optionalPositive(bound.maxDurationMs),
      noImprovementLimit: optionalPositive(bound.noImprovementLimit),
    },
  };
}
