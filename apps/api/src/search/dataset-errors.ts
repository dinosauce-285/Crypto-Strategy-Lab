import { DomainError } from '../http/domain-error';

export class DatasetNotFoundError extends DomainError {
  readonly status = 404;

  constructor(datasetId: string) {
    super(`Dataset "${datasetId}" not found`);
  }
}

export class DatasetInUseError extends DomainError {
  readonly status = 409;

  constructor(datasetId: string) {
    super(`Dataset "${datasetId}" is used by an experiment or active backtest`);
  }
}
