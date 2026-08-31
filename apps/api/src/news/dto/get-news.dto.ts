import type { NewsItem } from '@csl/contracts';

export interface GetNewsQueryDto {
  coin?: string;
  source?: string;
  from?: number;
  to?: number;
  limit?: number;
  offset?: number;
}

export interface GetNewsResponseDto {
  items: NewsItem[];
  total: number;
}
