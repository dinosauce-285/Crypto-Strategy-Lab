export interface SentimentStatsQueryDto {
  coin?: string;
}

export interface SentimentStatsResponseDto {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
}
