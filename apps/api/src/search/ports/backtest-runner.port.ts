import type { Trade } from '@csl/contracts';
import { DomainError } from '../../http/domain-error';
import type { RunnableStrategy } from './strategy-factory.port';

/**
 * Runs one strategy over one dataset and reports the trades it made — T12. It receives a
 * dataset id rather than candles: which candles, which rules and which window are what a
 * dataset is (ADR 0010), and the loop has no business knowing any of them.
 *
 * A dataset that does not exist is reported by throwing `UnknownDatasetError` — nothing
 * about it improves on a second attempt.
 */
export abstract class BacktestRunner {
  abstract run(strategy: RunnableStrategy, datasetId: string): Promise<Trade[]>;
}

export class UnknownDatasetError extends DomainError {
  readonly status = 404;

  constructor(readonly datasetId: string) {
    super('Dataset này không tồn tại.');
  }
}
