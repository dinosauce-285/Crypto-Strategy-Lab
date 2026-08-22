import type { Metrics } from '@csl/contracts';

export const SCORE_FORMULA_VERSION = 'v1';

export const SCORE_WEIGHTS = {
  return: 0.40,
  winRate: 0.20,
  drawdown: 0.30,
  sharpe: 0.10,
  sharpeScale: 3.0,
  tradeThreshold: 20,
} as const;

/**
 * Pure mathematical scoring function implementing ADR 0036 (v1).
 * Combines Return, Win Rate, Drawdown penalty, Sharpe ratio,
 * and statistical trade-count confidence damping.
 */
export function computeOverallScore(metrics: Metrics): number {
  const returnScore = metrics.totalReturn;
  const winRateScore = metrics.winRate;
  const drawdownPenalty = metrics.maxDrawdown;
  const sharpeContribution = Math.max(0, (metrics.sharpeRatio ?? 0) / SCORE_WEIGHTS.sharpeScale);

  const baseScore =
    SCORE_WEIGHTS.return * returnScore +
    SCORE_WEIGHTS.winRate * winRateScore -
    SCORE_WEIGHTS.drawdown * drawdownPenalty +
    SCORE_WEIGHTS.sharpe * sharpeContribution;

  // Trade count confidence damping: min(1.0, sqrt(N / 20))
  const confidenceMultiplier =
    metrics.tradeCount <= 0
      ? 0
      : Math.min(1.0, Math.sqrt(metrics.tradeCount / SCORE_WEIGHTS.tradeThreshold));

  const finalScore = baseScore * confidenceMultiplier;
  return Number(finalScore.toFixed(6));
}
