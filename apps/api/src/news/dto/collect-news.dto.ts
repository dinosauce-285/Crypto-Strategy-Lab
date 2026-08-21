export interface CollectNewsDto {
  source?: string;
  coins?: string[];
  from?: number;
  to?: number;
  limit?: number;
}

export interface CollectNewsResponseDto {
  collected: number;
  inserted: number;
  newsIds: string[];
}
