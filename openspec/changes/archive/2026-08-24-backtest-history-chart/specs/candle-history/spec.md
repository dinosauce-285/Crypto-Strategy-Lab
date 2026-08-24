## ADDED Requirements

### Requirement: A user views a static historical chart on the Backtest tab

The system SHALL display one candlestick chart for a selected pair and timeframe on the
Backtest tab, fetched once over a fixed default window and never updated live. Switching
pair or timeframe SHALL re-fetch and replace the chart's contents.

#### Scenario: A covered pair/timeframe is selected

- **WHEN** a user selects a pair and timeframe that already has stored candles covering
  the default window
- **THEN** the chart renders those candles

#### Scenario: An uncovered pair/timeframe is selected

- **WHEN** a user selects a pair/timeframe never watched on the Realtime tab, so nothing
  is stored for it
- **THEN** the chart shows the empty state, explaining that it has no history yet, not a
  blank grid

#### Scenario: Switching pair or timeframe

- **WHEN** a user changes the selected pair or timeframe
- **THEN** the chart re-fetches for the new selection and shows its own loading, empty,
  error, or data state independently of what the previous selection showed
