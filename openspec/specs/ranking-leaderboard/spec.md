# ranking-leaderboard Specification

## Purpose
Computes and renders real-time, dataset-scoped strategy leaderboards with dynamic multi-metric sorting, statistical trade-count confidence damping, and seamless single-run inspection navigation.

## Requirements

### Requirement: Dynamic dataset-scoped leaderboard computation
The system SHALL compute leaderboard rankings on-demand over completed experiments belonging strictly to a specified dataset, supporting sorting by Overall Score, Total Return, Win Rate, Max Drawdown, or Sharpe Ratio with a configurable Top-K limit.

#### Scenario: Querying Top-K candidates sorted by Overall Score
- **WHEN** user requests the leaderboard for a dataset with default sorting
- **THEN** the system returns up to K completed candidates ranked by composite Overall Score in descending order

#### Scenario: Multi-metric sorting on demand
- **WHEN** user requests the leaderboard sorted by `sharpeRatio` or `maxDrawdown`
- **THEN** the system re-orders the dataset's completed experiments according to the selected metric and direction

#### Scenario: Strict dataset isolation
- **WHEN** querying a leaderboard for dataset A
- **THEN** experiments executed on dataset B SHALL NOT appear in the result set

### Requirement: Composite overall score calculation with trade-count damping
The system SHALL evaluate a composite overall score combining Return, Win Rate, Max Drawdown, Sharpe Ratio, and a statistical trade-count confidence damping multiplier (\(\min(1.0, \sqrt{N / 20})\)) to penalize low-trade sample noise.

#### Scenario: Sufficient trade volume evaluation
- **WHEN** a candidate has 20 or more executed trades
- **THEN** full confidence multiplier (1.0) is applied to its base score

#### Scenario: Low trade sample confidence damping
- **WHEN** a candidate has few executed trades (e.g. 3 trades)
- **THEN** its score is scaled down proportionally by \(\sqrt{N / 20}\) to prevent luck-based over-ranking

### Requirement: Real-time leaderboard push notification
The system SHALL emit a lightweight update notification to topic `leaderboard:<datasetId>` on the WebSocket push channel whenever an experiment completes, allowing connected web clients to refresh without a full page reload.

#### Scenario: Experiment completion notifies audience
- **WHEN** a background worker completes an experiment on a dataset
- **THEN** a notification event is published to `leaderboard:<datasetId>` and connected clients refresh their table

### Requirement: Leaderboard candidate inspection navigation
The system SHALL allow users to click any candidate row in the leaderboard table to navigate to the single-run backtest screen with the exact candidate recipe and dataset pre-loaded.

#### Scenario: Clicking a leaderboard row opens backtest view
- **WHEN** user clicks on a candidate row in the leaderboard table
- **THEN** the application transitions to the Backtest screen pre-loaded with that candidate's configuration and dataset
