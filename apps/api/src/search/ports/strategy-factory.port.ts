import type { CandidateSpec } from '@csl/contracts';

/**
 * Turns a specification back into something runnable — T11's registry. A specification
 * naming a strategy nobody registered is reported by throwing `UnknownStrategyError`,
 * which the processor treats as permanently broken rather than as bad luck (ADR 0007).
 */
export abstract class StrategyFactory {
  abstract build(spec: CandidateSpec): Promise<RunnableStrategy>;
}

/** Opaque here on purpose: the loop carries it from the factory to the runner and never calls it. */
export type RunnableStrategy = object;

export class UnknownStrategyError extends Error {
  constructor(readonly strategyId: string) {
    super(`strategy "${strategyId}" is not registered`);
  }
}
