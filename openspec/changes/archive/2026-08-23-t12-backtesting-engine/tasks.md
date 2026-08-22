## 0. Decisions

- [x] 0.1 docs/decisions/0033-backtest-execution-rules.md — backtest execution rules for entry price, trading fees, and warmup periods

## 1. Contracts & Interfaces

- [x] 1.1 Define backtest execution types (`BacktestExecutionRules`, `CandidateSpec`, `Trade`, `BacktestRunResult`) in `packages/contracts`.
- [x] 1.2 Define `BacktestEnginePort` interface in `apps/api` for strategy execution.

## 2. Strategy Instantiation & Data Preparation

- [x] 2.1 Connect the engine with the Strategy Registry to construct runnable strategy instances from `CandidateSpec` (ADR 0007).
- [x] 2.2 Feed required indicator series to the strategy based on its declared metadata requirements (ADR 0008).

## 3. Backtesting Simulation Loop

- [x] 3.1 Implement `BacktestEngineService` with strictly causal sequential iteration over dataset candles (no forward peeking).
- [x] 3.2 Implement simulated position entry and exit following dataset execution rules (entry at signal close vs next open, and fee deduction).
- [x] 3.3 Enforce warmup period skipping to prevent premature trades before indicators stabilize.

## 4. Verification & Quality Gates

- [x] 4.1 Add deterministic unit tests proving identical trade outputs on repeated backtest runs (brief section 36).
- [x] 4.2 Add tests for edge cases (zero trades, fee impacts, warmup boundary, multiple signals).
- [x] 4.3 Run `pnpm lint`, `pnpm test`, and `pnpm build` to verify all quality gates pass.
