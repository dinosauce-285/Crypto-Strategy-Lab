import { Injectable } from '@nestjs/common';
import type { BacktestRules, Candle, Metrics, Trade } from '@csl/contracts';
import { evaluateTrades } from './calculators/metrics.calculator';
import { EvaluationRepository } from './evaluation.repository';
import { EvaluationInput, EvaluationResult, EvaluatorPort } from './ports/evaluator.port';

@Injectable()
export class EvaluatorService implements EvaluatorPort {
  constructor(private readonly repository: EvaluationRepository) {}

  async isRecorded(datasetId: string, specHash: string): Promise<boolean> {
    return this.repository.isRecorded(datasetId, specHash);
  }

  /**
   * Pure evaluation calculation without database side effects.
   */
  computeMetrics(
    trades: readonly Trade[],
    rules: BacktestRules,
    candles?: readonly Candle[],
  ): Metrics {
    return evaluateTrades(trades, rules, candles);
  }

  /**
   * Computes metrics and persists the Experiment outcome and Trade rows atomically.
   */
  async evaluateAndRecord(input: EvaluationInput): Promise<EvaluationResult> {
    const metrics = this.computeMetrics(input.trades, input.rules, input.candles);

    const experimentId = await this.repository.recordCompleted({
      datasetId: input.datasetId,
      spec: input.spec,
      specHash: input.specHash,
      metrics,
      trades: input.trades,
      leaseId: input.leaseId,
    });

    return {
      metrics,
      ...(experimentId ? { experimentId } : {}),
    };
  }

  /**
   * Records a failed experiment run in the database.
   */
  async recordFailed(
    datasetId: string,
    spec: unknown,
    specHash: string,
    error: string,
  ): Promise<boolean> {
    return this.repository.recordFailed({
      datasetId,
      spec,
      specHash,
      error,
    });
  }
}
