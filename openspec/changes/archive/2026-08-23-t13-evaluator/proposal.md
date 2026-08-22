## Why

Strategy evaluation must be strictly separated from strategy execution and implementation (brief sections 20 & 37). A strategy emits signals and a backtest simulates order execution; the Evaluator converts the resulting list of trades into standardized performance metrics (Total Return, Profit/Loss, Win Rate, Trade Count, Max Drawdown, Profit Factor, Sharpe Ratio) according to dataset evaluation rules, and persists both the experiment outcome and individual trade records into the database (brief sections 35 & 36).

Storing all executed trades alongside the candidate recipe allows future metrics to be computed without re-running backtests, while keeping experiment records clean of scores/ranks allows leaderboard scoring formulas to evolve freely (ADR 0011).

T13 · [Evaluator](https://trello.com/c/Thien-t13-evaluator).
Brief: section 20 ("strategy evaluation must be separate from strategy implementation" + list of 7 metrics); section 35 (Experiment and Trades database tables); section 36 (reproducibility & storage of complete recipe); section 37 (Evaluation component); section 40 question 8.

## Decisions

**Settled**

- [0007](../../../docs/decisions/0007-candidate-as-spec.md) — an experiment stores the full `CandidateSpec` by value, not a strategy name, so it can be rebuilt identically months later.
- [0009](../../../docs/decisions/0009-strategy-versioning.md) — strategy version and parameters hash are stamped by value on each candidate member, never as foreign keys.
- [0010](../../../docs/decisions/0010-dataset-carries-the-backtest-rules.md) — `datasetId` is stored in its own column; dataset rules (`profitMode`, `drawdownMode`, `feeRate`, `entryPrice`, `warmupCandles`) dictate how trades are evaluated.
- [0011](../../../docs/decisions/0011-leaderboard-is-recomputed.md) — `Experiment` rows store raw metrics only; score and rank are computed dynamically on read.
- [0016](../../../docs/decisions/0016-database-enforces-what-a-type-cannot.md) — database models enforce relational uniqueness (`[datasetId, specHash]` and `[experimentId, seq]`) and decimal precision for financial quantities.
- [0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md) — cross-module decoupling via abstract class DI tokens (`EvaluatorPort`).
- [0034](../../../docs/decisions/0034-backtest-execution-rules-for-entry-price-trading-fees-and-wa.md) — execution mechanics for entry price timing, fees, and warmup.

**To settle**

- **Metric evaluation formulas for simple/compound profit, trade-close/per-candle drawdown, Profit Factor, and Sharpe Ratio** — new decision record. Task 0.1.

## What Changes

- New `apps/api/src/evaluation/` domain module providing `EvaluatorPort` (abstract DI token), `EvaluatorService`, and `EvaluationRepository`.
- Metric calculation engine:
  - `totalReturn`: simple percentage sum or geometric compounded return governed by `dataset.rules.profitMode`.
  - `profitLoss`: exact decimal string sum of net profit across all closed trades.
  - `winRate`: fraction of profitable trades over total trades in range $[0, 1]$.
  - `tradeCount`: total number of completed trades.
  - `maxDrawdown`: maximum peak-to-trough decline in range $[0, 1]$, computed on closed trade equity (`trade-close`) or continuous candle price equity (`per-candle`).
  - `profitFactor`: ratio of gross winning profits to gross losing losses, or `null` if no losses occurred.
  - `sharpeRatio`: annualized ratio of mean excess return over return volatility, or `null` if insufficient trades / zero variance.
- Persistence pipeline:
  - Atomically records the completed `Experiment` entity with calculated metrics, `CandidateSpec`, and `specHash`.
  - Atomically writes all individual `Trade` entities with 1-based sequential indexing (`seq`).
- Comprehensive unit tests covering pure metric calculations, boundary conditions (zero trades, only wins, only losses, zero volatility), and database persistence.

## Capabilities

### New Capabilities
- `trade-evaluation`: calculation of the 7 performance metrics from simulated trades under dataset rules, and atomic database persistence of experiment and trade records.

### Modified Capabilities
(none)

## Impact

- `apps/api/src/evaluation/`: `evaluation.module.ts`, `evaluator.service.ts`, `evaluator.service.spec.ts`, `evaluation.repository.ts`, `ports/evaluator.port.ts`, `calculators/`.
- `apps/api/src/app.module.ts`: imports `EvaluationModule`.
- `docs/decisions/`: new decision record for metric evaluation formulas and drawdown modes.
- `openspec/specs/trade-evaluation/spec.md`: new capability specification.
