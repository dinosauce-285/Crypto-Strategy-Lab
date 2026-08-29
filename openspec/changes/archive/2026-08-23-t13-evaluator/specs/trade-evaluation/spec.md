## Purpose

Converts simulated trade execution logs into standardized quantitative performance metrics according to dataset evaluation rules, and atomically records experiment and individual trade records in the database.

## ADDED Requirements

### Requirement: Standard metric evaluation from trade executions
The system SHALL compute performance metrics (`totalReturn`, `profitLoss`, `winRate`, `tradeCount`, `maxDrawdown`) from a chronological list of simulated trades according to the dataset's `profitMode` and `drawdownMode` rules.

#### Scenario: Simple profit mode total return
- **WHEN** a dataset defines `profitMode: "simple"` and a sequence of trades is evaluated
- **THEN** `totalReturn` is calculated as the linear sum of percentage returns across all executed trades

#### Scenario: Compounded profit mode total return
- **WHEN** a dataset defines `profitMode: "compound"` and a sequence of trades is evaluated
- **THEN** `totalReturn` is calculated as the geometric compounded product of individual trade returns $\prod (1 + r_i) - 1$

#### Scenario: Win rate and profit loss calculation
- **WHEN** a list of trades containing both profitable and unprofitable exits is evaluated
- **THEN** `winRate` is the ratio of winning trades ($\text{profit} > 0$) to total `tradeCount`, and `profitLoss` is the exact decimal sum of all trade net profits

#### Scenario: Trade close drawdown mode
- **WHEN** a dataset defines `drawdownMode: "trade-close"`
- **THEN** `maxDrawdown` is computed as the maximum percentage drop from any cumulative equity peak to subsequent trough evaluated at discrete trade close events

#### Scenario: Per-candle drawdown mode
- **WHEN** a dataset defines `drawdownMode: "per-candle"` and historical candles are supplied
- **THEN** `maxDrawdown` is computed across the continuous high/low equity curve throughout the entire holding duration of each position

#### Scenario: Empty trade list evaluation
- **WHEN** a backtest yields zero executed trades
- **THEN** `tradeCount` is 0, `totalReturn` is 0, `profitLoss` is `"0"`, `winRate` is 0, `maxDrawdown` is 0, and optional metrics (`profitFactor`, `sharpeRatio`) are null

### Requirement: Optional risk-adjusted metrics calculation
The system SHALL compute `profitFactor` and `sharpeRatio` when sufficient trade data exists.

#### Scenario: Profit factor calculation with losses
- **WHEN** evaluated trades contain both winning and losing trades
- **THEN** `profitFactor` is the ratio of gross profits to the absolute value of gross losses

#### Scenario: Profit factor when no losses exist
- **WHEN** evaluated trades contain only winning trades (zero gross loss)
- **THEN** `profitFactor` is returned as null

#### Scenario: Sharpe ratio calculation
- **WHEN** evaluated trades contain at least 2 trades with non-zero return variance
- **THEN** `sharpeRatio` is computed as the mean excess trade return divided by return standard deviation

#### Scenario: Sharpe ratio with zero variance
- **WHEN** all evaluated trades produce identical return (zero return standard deviation) or fewer than 2 trades exist
- **THEN** `sharpeRatio` is returned as null

### Requirement: Atomic persistence of experiment outcome and trade records
The system SHALL persist the complete `Experiment` entity and all individual `Trade` entities with 1-based sequential indices (`seq`) in an atomic database transaction.

#### Scenario: Persisting experiment with trades
- **WHEN** an evaluation finishes for a given `CandidateSpec`, `specHash`, and `datasetId`
- **THEN** one `Experiment` row is recorded with the computed metrics and `status: "completed"`, and every trade is inserted into the `Trade` table with unique `(experimentId, seq)`

#### Scenario: Failed backtest record
- **WHEN** a backtest job fails with an error message
- **THEN** an `Experiment` row is recorded with `status: "failed"`, the error message in the `error` column, null metrics, and zero trade rows

### Requirement: Strict separation of evaluation from strategy logic
The Evaluator SHALL accept only static trade data and dataset rules, without referencing or executing strategy internal state, exchange APIs, or chart rendering code.

#### Scenario: Pure evaluator function verification
- **WHEN** evaluating a trade list
- **THEN** the evaluator computes identical metrics for identical inputs without performing database queries, network requests, or mutating strategy states
