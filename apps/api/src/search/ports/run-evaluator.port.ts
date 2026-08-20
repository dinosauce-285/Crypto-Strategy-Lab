import type { Metrics, Trade } from '@csl/contracts';

/**
 * Scores the trades a backtest produced — T13. Separate from the runner because a
 * strategy emits signals and never computes its own profit, and the same separation has
 * to hold one level up or it was not a principle.
 */
export abstract class RunEvaluator {
  abstract score(trades: Trade[], datasetId: string): Promise<Metrics>;
}
