export interface AnalyzeBatchDto {
  limit?: number;
}

export interface AnalyzeBatchResponseDto {
  processed: number;
  updated: number;
  failed: number;
  errors?: Array<{ id: string; error: string }>;
}
