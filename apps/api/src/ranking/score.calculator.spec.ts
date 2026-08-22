import type { Metrics } from '@csl/contracts';
import { computeOverallScore, SCORE_FORMULA_VERSION } from './score.calculator';

describe('ScoreCalculator (T18, ADR 0036)', () => {
  it('declares score formula version v1', () => {
    expect(SCORE_FORMULA_VERSION).toBe('v1');
  });

  it('calculates composite score with full confidence when trade count >= 20', () => {
    const metrics: Metrics = {
      totalReturn: 0.25, // 0.4 * 0.25 = 0.10
      winRate: 0.60,     // 0.2 * 0.60 = 0.12
      maxDrawdown: 0.10, // -0.3 * 0.10 = -0.03
      sharpeRatio: 1.5,  // 0.1 * (1.5 / 3) = 0.05
      tradeCount: 25,    // confidence = min(1.0, sqrt(25/20)) = 1.0
      profitLoss: '250',
    };

    // BaseScore = 0.10 + 0.12 - 0.03 + 0.05 = 0.24
    // Final = 0.24 * 1.0 = 0.24
    const score = computeOverallScore(metrics);
    expect(score).toBeCloseTo(0.24, 4);
  });

  it('damps score for small trade samples (e.g. 5 trades)', () => {
    const matureSample: Metrics = {
      totalReturn: 0.20,
      winRate: 0.50,
      maxDrawdown: 0.05,
      sharpeRatio: 1.0,
      tradeCount: 20, // confidence = 1.0
      profitLoss: '200',
    };

    const smallSample: Metrics = {
      totalReturn: 0.20,
      winRate: 0.50,
      maxDrawdown: 0.05,
      sharpeRatio: 1.0,
      tradeCount: 5, // confidence = sqrt(5/20) = 0.5
      profitLoss: '200',
    };

    const matureScore = computeOverallScore(matureSample);
    const smallScore = computeOverallScore(smallSample);

    expect(smallScore).toBeLessThan(matureScore);
    expect(smallScore).toBeCloseTo(matureScore * 0.5, 4);
  });

  it('returns 0 score when trade count is 0', () => {
    const metrics: Metrics = {
      totalReturn: 0.10,
      winRate: 0.50,
      maxDrawdown: 0.05,
      tradeCount: 0,
      profitLoss: '0',
    };

    const score = computeOverallScore(metrics);
    expect(score).toBe(0);
  });
});
