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
    throw new InvalidLeaderboardQueryError('Chưa chọn dataset để xếp hạng.');
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
      `Không xếp hạng theo "${value}" được. Các cột hợp lệ: ${LEADERBOARD_SORT_FIELDS.join(', ')}.`,
    );
  }
  return value as LeaderboardSortField;
}

function parseDirection(value?: string): SortDirection | undefined {
  if (value === undefined) return undefined;
  if (!(SORT_DIRECTIONS as readonly string[]).includes(value)) {
    throw new InvalidLeaderboardQueryError(
      `Chiều sắp xếp "${value}" không hợp lệ. Chỉ nhận: ${SORT_DIRECTIONS.join(', ')}.`,
    );
  }
  return value as SortDirection;
}

function parseLimit(value?: string): number | undefined {
  if (value === undefined || value === '') return undefined;
  const limit = Number(value);
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    throw new InvalidLeaderboardQueryError(
      `Số dòng phải là số nguyên từ 1 đến ${MAX_LIMIT}, nhận được "${value}".`,
    );
  }
  return limit;
}
