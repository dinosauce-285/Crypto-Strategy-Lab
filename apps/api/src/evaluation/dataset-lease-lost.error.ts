import { DomainError } from '../http/domain-error';

export class DatasetLeaseLostError extends DomainError {
  readonly status = 409;

  constructor(readonly datasetId: string) {
    super('Lượt chạy tạm dừng quá lâu nên mất chỗ giữ dataset. Chạy lại từ đầu.');
  }
}
