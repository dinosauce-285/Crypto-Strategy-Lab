import type { BacktestRules, Candle, CandidateSpec, Metrics, Trade } from '@csl/contracts';

export interface EvaluationInput {
  datasetId: string;
  spec: CandidateSpec;
  specHash: string;
  rules: BacktestRules;
  trades: readonly Trade[];
  candles?: readonly Candle[];
}

export interface EvaluationResult {
  metrics: Metrics;
  experimentId?: string;
}

/**
 * Cross-module gateway for evaluating simulated trades and recording experiment outcomes.
 * Module consumers inject this abstract token (ADR 0020 & BACKEND_CONSTRAINT).
 */
export abstract class EvaluatorPort {
  abstract computeMetrics(
    trades: readonly Trade[],
    rules: BacktestRules,
    candles?: readonly Candle[],
  ): Metrics;

  abstract evaluateAndRecord(
    input: EvaluationInput,
  ): Promise<EvaluationResult>;

  abstract recordFailed(
    datasetId: string,
    spec: unknown,
    specHash: string,
    error: string,
  ): Promise<boolean>;
}
