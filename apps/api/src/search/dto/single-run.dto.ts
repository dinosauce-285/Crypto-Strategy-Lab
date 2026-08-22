import type { BacktestRules, CandidateSpec, Dataset, Timeframe } from '@csl/contracts';

export interface SingleRunRequestDto {
  datasetId?: string;
  dataset?: {
    pair: string;
    timeframe: Timeframe;
    from: number;
    to: number;
    rules: BacktestRules;
  };
  spec: CandidateSpec;
}

export interface SingleRunResponseDto {
  experimentId?: string;
  dataset: Dataset;
  spec: CandidateSpec;
  metrics: {
    totalReturn: number;
    profitLoss: string;
    winRate: number;
    tradeCount: number;
    maxDrawdown: number;
    profitFactor?: number;
    sharpeRatio?: number;
  };
  trades: Array<{
    seq: number;
    side: 'BUY' | 'SELL';
    entryTime: number;
    entryPrice: string;
    exitTime: number;
    exitPrice: string;
    profit: string;
  }>;
  candles: Array<{
    pair: string;
    timeframe: Timeframe;
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closed: boolean;
  }>;
  indicators: Record<string, number[]>;
}
