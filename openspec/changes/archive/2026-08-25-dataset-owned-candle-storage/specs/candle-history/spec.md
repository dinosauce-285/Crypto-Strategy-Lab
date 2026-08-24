## REMOVED Requirements

### Requirement: A pair/timeframe is backfilled on first watch
**Reason**: Superseded by `0040` — watching a pair/timeframe no longer fetches or
stores anything. The rate-limit and reproducibility reasoning that motivated this
requirement is preserved, just re-homed onto Dataset creation (see the
`dataset-history` capability) instead of Realtime watching.
**Migration**: A screen's initial history now comes from a live exchange read every
time (see `market-stream`'s "A watcher sees the market move without reloading"
requirement). Nothing persists as a side effect of watching; only creating a Dataset
does.

## MODIFIED Requirements

### Requirement: A closed candle is available from storage, not the exchange

The system SHALL serve an explicit-date-range request for historical candles for a
pair and timeframe from its own storage only — a range request SHALL NOT trigger a
live call to the exchange. This no longer holds for the default "most recent N" mode
(no `from`/`to` given), which is read live from the exchange (`0040`) rather than from
storage.

#### Scenario: A range is requested

- **WHEN** a client requests candles for `BTCUSDT` on `1m` with an explicit `from`/`to`
- **THEN** the system returns the stored candles covering that range
- **AND** no request is made to the exchange to serve it

#### Scenario: The range extends beyond what is stored

- **WHEN** a client requests a range older than the earliest stored candle
- **THEN** the system returns only the candles it holds, without failing the request

#### Scenario: The default "most recent N" mode reads live

- **WHEN** a client requests candles with no `from`/`to`
- **THEN** the system fetches them live from the exchange
- **AND** nothing is written to storage as a result

### Requirement: A watcher sees history immediately, then sees it stay live

A screen watching a pair and timeframe SHALL show its recent history as soon as it is
read from the exchange, and SHALL continue to receive newly closed candles for it
without a reload, using the existing live channel. It SHALL show a distinct state
while loading, when nothing has arrived yet, and when the exchange cannot be reached,
and the error state SHALL say what to do about it.

#### Scenario: History loads

- **WHEN** a client opens the chart for a pair and timeframe
- **THEN** the chart shows its recent history without waiting for a new candle to close

#### Scenario: No history yet

- **WHEN** a client opens the chart for a pair and timeframe the exchange has no
  candles for yet (e.g. a newly listed pair)
- **THEN** the chart shows an empty state rather than a blank grid

#### Scenario: History cannot be reached

- **WHEN** the exchange cannot be reached to serve the recent-candle history
- **THEN** the chart shows an error state naming what failed and how to retry
- **AND** no stale or partial history from prior storage is shown in its place

#### Scenario: A new candle closes while the chart is open

- **WHEN** a client is viewing history for a pair and timeframe
- **AND** a new candle closes for it
- **THEN** the chart adds that candle without a reload

### Requirement: A user views a static historical chart on the Backtest tab

The system SHALL display one candlestick chart for a selected pair and timeframe on the
Backtest tab, fetched once over a fixed default window and never updated live. Switching
pair or timeframe SHALL re-fetch and replace the chart's contents. This chart requests
an explicit `from`/`to` range and stays storage-only — its data depends on a Dataset
having been created covering that pair, timeframe and window, not on the pair ever
having been watched on the Realtime tab (`0040`/`0041`).

#### Scenario: A covered pair/timeframe is selected

- **WHEN** a user selects a pair and timeframe that already has stored candles covering
  the default window
- **THEN** the chart renders those candles

#### Scenario: An uncovered pair/timeframe is selected

- **WHEN** a user selects a pair/timeframe with no Dataset ever created covering the
  default window, so nothing is stored for it
- **THEN** the chart shows the empty state, explaining that it has no history yet, not a
  blank grid

#### Scenario: Switching pair or timeframe

- **WHEN** a user changes the selected pair or timeframe
- **THEN** the chart re-fetches for the new selection and shows its own loading, empty,
  error, or data state independently of what the previous selection showed
