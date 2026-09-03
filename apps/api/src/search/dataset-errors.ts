import { DomainError } from '../http/domain-error';

export class DatasetNotFoundError extends DomainError {
  readonly status = 404;

  constructor(readonly datasetId: string) {
    super('Không tìm thấy dataset này. Tải lại danh sách rồi chọn cái khác.');
  }
}

export class DatasetInUseError extends DomainError {
  readonly status = 409;

  constructor(readonly datasetId: string) {
    super('Không xoá được: dataset này đã có kết quả thí nghiệm, hoặc đang có backtest chạy.');
  }
}
