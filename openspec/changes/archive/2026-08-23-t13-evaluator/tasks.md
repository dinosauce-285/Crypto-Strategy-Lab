## 0. Decisions

- [x] 0.1 docs/decisions/0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md — evaluation mathematical formulas for profit calculation modes, drawdown tracking, and statistical metrics

## 1. Core Metric Calculation Layer

- [x] 1.1 Implement pure calculation functions for total return and profit/loss (linear sum vs geometric compound based on `profitMode`)
- [x] 1.2 Implement win rate and trade count calculators with safe boundary handling for empty trade lists
- [x] 1.3 Implement max drawdown calculators supporting `trade-close` cumulative equity and `per-candle` continuous price equity curves
- [x] 1.4 Implement optional statistical metrics: Profit Factor (gross win / gross loss) and Sharpe Ratio with zero-variance protection

## 2. Evaluation Module & Repository Integration

- [x] 2.1 Define `EvaluatorPort` abstract DI token and `EvaluatorService` in `apps/api/src/evaluation/`
- [x] 2.2 Implement `EvaluationRepository` to persist `Experiment` outcomes and individual `Trade` records with 1-based `seq` in an atomic transaction
- [x] 2.3 Wire `EvaluationModule` into `apps/api/src/app.module.ts` and export `EvaluatorPort` for downstream backtest runner consumption

## 3. Unit Tests & Verification

- [x] 3.1 Write unit tests for pure metric calculations covering edge cases (zero trades, 100% win, 100% loss, compounding, zero drawdown, undefined profit factor / Sharpe)
- [x] 3.2 Write unit tests for `EvaluatorService` and `EvaluationRepository` verifying contract compliance and atomic trade persistence
- [x] 3.3 Run quality gates (`pnpm --dir apps/api lint`, `pnpm --dir apps/api exec tsc --noEmit`, `pnpm --dir apps/api test`, and `pnpm build`)
