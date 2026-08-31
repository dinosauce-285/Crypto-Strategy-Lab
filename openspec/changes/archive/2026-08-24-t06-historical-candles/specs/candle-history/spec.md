## Purpose

Closed candles held in storage instead of the exchange, so a chart can show what
already happened without re-asking Binance, and a backtest run later reads the exact
same candles it read the first time.

## ADDED Requirements

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
