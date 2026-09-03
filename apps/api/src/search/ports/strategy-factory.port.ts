import type { CandidateSpec, DataRequest, Signal, StrategyContext } from '@csl/contracts';
import { DomainError } from '../../http/domain-error';

/**
 * Turns a specification back into something runnable — T11's registry. A specification
 * naming a strategy nobody registered is reported by throwing `UnknownStrategyError`,
 * which the processor treats as permanently broken rather than as bad luck (ADR 0007).
 */
export abstract class StrategyFactory {
  abstract build(spec: CandidateSpec): Promise<RunnableStrategy>;
}

export interface RunnableStrategy {
  readonly spec: CandidateSpec;
  readonly warmup: number;
  requires(): DataRequest[];
  analyze(context: StrategyContext): Signal;
}

export class UnknownStrategyError extends DomainError {
  readonly status = 400;

  constructor(readonly strategyId: string) {
    super(`Chiến lược "${strategyId}" chưa được đăng ký. Chọn lại trong danh sách.`);
  }
}
