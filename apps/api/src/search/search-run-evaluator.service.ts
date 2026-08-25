import { Injectable } from '@nestjs/common';
import type { Metrics, Trade } from '@csl/contracts';
import { EvaluatorPort } from '../evaluation/ports/evaluator.port';
import { DatasetRepository } from './dataset.repository';
import { RunEvaluator } from './ports/run-evaluator.port';
import { UnknownDatasetError } from './ports/backtest-runner.port';

@Injectable()
export class SearchRunEvaluatorService extends RunEvaluator {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly evaluator: EvaluatorPort,
  ) {
    super();
  }

  async score(trades: Trade[], datasetId: string): Promise<Metrics> {
    const dataset = await this.datasets.findById(datasetId);
    if (!dataset) {
      throw new UnknownDatasetError(datasetId);
    }
    return this.evaluator.computeMetrics(trades, dataset.rules);
  }
}
