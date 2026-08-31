import {
  LEADERBOARD_SORT_FIELDS,
  SORT_DIRECTIONS,
  type LeaderboardQuery,
  type LeaderboardSortField,
  type SortDirection,
} from '@csl/contracts';
import { DomainError } from '../../http/domain-error';

const MAX_LIMIT = 50;

export class InvalidLeaderboardQueryError extends DomainError {
  readonly status = 400;
}

export function parseLeaderboardQuery(query: {
  datasetId?: string;
  sortBy?: string;
  direction?: string;
  limit?: string;
}): LeaderboardQuery {
  const datasetId = query.datasetId?.trim();
  if (!datasetId) {
    throw new InvalidLeaderboardQueryError('Query parameter "datasetId" is required');
  }

  return {
    datasetId,
    sortBy: parseSortBy(query.sortBy),
    direction: parseDirection(query.direction),
    limit: parseLimit(query.limit),
  };
}

function parseSortBy(value?: string): LeaderboardSortField | undefined {
  if (value === undefined) return undefined;
  if (!(LEADERBOARD_SORT_FIELDS as readonly string[]).includes(value)) {
    throw new InvalidLeaderboardQueryError(
      `Invalid sortBy parameter "${value}". Allowed values: ${LEADERBOARD_SORT_FIELDS.join(', ')}`,
    );
  }
  return value as LeaderboardSortField;
}

function parseDirection(value?: string): SortDirection | undefined {
  if (value === undefined) return undefined;
  if (!(SORT_DIRECTIONS as readonly string[]).includes(value)) {
    throw new InvalidLeaderboardQueryError(
      `Invalid direction parameter "${value}". Allowed values: ${SORT_DIRECTIONS.join(', ')}`,
    );
  }
  return value as SortDirection;
}

function parseLimit(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new InvalidLeaderboardQueryError(
      `Query parameter "limit" must be an integer between 1 and ${MAX_LIMIT}, received "${value}"`,
    );
  }
  return limit;
}
