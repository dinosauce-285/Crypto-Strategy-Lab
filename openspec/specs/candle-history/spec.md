# candle-history Specification

## Purpose
Closed candles held in storage instead of the exchange, so a chart can show what
already happened without re-asking Binance, and a backtest run later reads the exact
same candles it read the first time.

## Requirements

### Requirement: A pair/timeframe is backfilled on first watch

The system SHALL fetch historical candles for a pair and timeframe from the exchange
the first time it is watched and has no stored history, and SHALL NOT repeat that fetch
for a pair/timeframe that already has stored history.

#### Scenario: First watch of a pair/timeframe

- **WHEN** a client watches `BTCUSDT` on `1m` and no candle for that pair/timeframe is stored
- **THEN** the system fetches historical candles from the exchange and stores them

#### Scenario: A pair/timeframe already has history

- **WHEN** a client watches a pair/timeframe that already has stored candles
- **THEN** no backfill fetch is made to the exchange

### Requirement: A closed candle is available from storage, not the exchange

The system SHALL serve a range of historical candles for a pair and timeframe from its
own storage. A request for candles SHALL NOT trigger a live call to the exchange.

#### Scenario: A range is requested

- **WHEN** a client requests candles for `BTCUSDT` on `1m` over a time range
- **THEN** the system returns the stored candles covering that range
- **AND** no request is made to the exchange to serve it

#### Scenario: The range extends beyond what is stored

- **WHEN** a client requests a range older than the earliest stored candle
- **THEN** the system returns only the candles it holds, without failing the request

### Requirement: A stored candle does not change once closed

The system SHALL treat a closed candle already in storage as immutable — the same
pair, timeframe and open time SHALL always resolve to the same values.

#### Scenario: The same candle is read twice

- **WHEN** the candle for a given pair, timeframe and open time is read at two different
  times
- **THEN** both reads return identical values

### Requirement: A delivered candle carries no exchange-specific detail

A candle leaving this capability SHALL use the shared `Candle` contract. Exchange-
specific field names, encodings or symbols SHALL NOT appear in a delivered candle.

#### Scenario: A backfilled candle is delivered

- **WHEN** a backfilled candle reaches a client
- **THEN** its payload matches the `Candle` contract
- **AND** it carries no exchange-specific field

### Requirement: A watcher sees history immediately, then sees it stay live

A screen watching a pair and timeframe SHALL show the stored history for it as soon as
it is available, and SHALL continue to receive newly closed candles for it without a
reload, using the existing live channel. It SHALL show a distinct state while loading,
when there is no history yet, and when history cannot be reached, and the error state
SHALL say what to do about it.

#### Scenario: History loads

- **WHEN** a client opens the chart for a pair and timeframe with stored history
- **THEN** the chart shows that history without waiting for a new candle to close

#### Scenario: No history yet

- **WHEN** a client opens the chart for a pair and timeframe with no stored history
- **THEN** the chart shows an empty state rather than a blank grid

#### Scenario: History cannot be reached

- **WHEN** the history endpoint is unreachable
- **THEN** the chart shows an error state naming what failed and how to retry

#### Scenario: A new candle closes while the chart is open

- **WHEN** a client is viewing history for a pair and timeframe
- **AND** a new candle closes for it
- **THEN** the chart adds that candle without a reload

### Requirement: A user views several timeframes of one pair at once

The system SHALL display 4 charts for one pair simultaneously, each showing its own
timeframe, and SHALL let each chart's timeframe be changed independently of the other
three. The default layout SHALL be `5m` and `15m` on the first row, `1h` and `4h` on
the second.

#### Scenario: Default layout on load

- **WHEN** a user opens the dashboard
- **THEN** four charts are shown for the selected pair
- **AND** their timeframes read, in order, `5m`, `15m`, `1h`, `4h`

#### Scenario: Changing one chart's timeframe does not affect the others

- **WHEN** a user changes one chart's timeframe
- **THEN** that chart now shows the new timeframe
- **AND** the other three charts keep showing their own timeframe unchanged

#### Scenario: Each chart keeps its own state

- **WHEN** one chart is loading, empty, or erroring
- **THEN** the other three charts are unaffected and show their own state independently

### Requirement: A range of candles can be requested by an explicit date

The system SHALL let a caller request candles for a pair and timeframe between an
explicit `from` and `to` time, alongside the existing "most recent N" mode. A range
request SHALL be served from storage only, on the same terms as the existing
requirement that a candle is available from storage and not the exchange — it SHALL
NOT trigger a live call to the exchange, even when the requested range is not fully
backfilled.

#### Scenario: A fully-covered range is requested

- **WHEN** a client requests candles for a pair and timeframe between a `from` and `to`
  that lie entirely within what is already stored
- **THEN** the system returns exactly the candles in that range, ordered oldest to
  newest

#### Scenario: The range extends before the earliest stored candle

- **WHEN** a client requests a range whose `from` is older than the earliest stored
  candle for that pair and timeframe
- **THEN** the system returns the candles it holds within the range, without failing
  the request and without fetching the missing portion from the exchange

#### Scenario: One bound is given without the other

- **WHEN** a client supplies `from` without `to`, or `to` without `from`
- **THEN** the request is rejected rather than guessing the missing bound

#### Scenario: A range request never reaches the exchange

- **WHEN** a client requests a range that is entirely missing from storage
- **THEN** the system returns an empty result
- **AND** no request is made to the exchange to fill it

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
