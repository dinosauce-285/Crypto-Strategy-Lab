import type { NewsItem } from '@csl/contracts';

export interface GetNewsQueryDto {
  coin?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface GetNewsResponseDto {
  items: NewsItem[];
  total: number;
}
