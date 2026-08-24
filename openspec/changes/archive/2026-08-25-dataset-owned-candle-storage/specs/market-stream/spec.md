## MODIFIED Requirements

### Requirement: A watcher sees the market move without reloading

A screen watching a pair and timeframe SHALL show the latest price and the candles that
have closed since it connected, updating in place. It SHALL show a distinct state while
connecting, when nothing has arrived yet, and when the stream cannot be reached, and the
error state SHALL say what to do about it. The candles shown when a watch begins SHALL
be read live from the exchange rather than from prior storage, so the screen no longer
depends on that pair and timeframe having been watched before.

#### Scenario: The market moves

- **WHEN** the watched pair trades
- **THEN** the displayed price changes without the page reloading
- **AND** a candle that closes is added to what is displayed

#### Scenario: The channel cannot be reached

- **WHEN** the server is unreachable
- **THEN** the screen shows an error state naming what failed and how to retry

#### Scenario: Nothing has arrived yet

- **WHEN** the client is subscribed and no price or candle has arrived
- **THEN** the screen shows an empty state saying it is waiting for the market rather than a blank panel

#### Scenario: The exchange cannot be reached for the initial history

- **WHEN** a client watches a pair and timeframe for the first time
- **AND** the exchange cannot be reached to serve the recent-candle history
- **THEN** the screen shows an error state naming what failed and how to retry
- **AND** no stale or partial history from prior storage is shown in its place
