import { DomainError } from '../http/domain-error';

export class DatasetLeaseLostError extends DomainError {
  readonly status = 409;

  constructor(datasetId: string) {
    super(`Dataset "${datasetId}" is no longer protected for this backtest`);
  }
}
