## Purpose

Provides automatic reconnection and gap backfill for market-data candle streams when the exchange WebSocket drops.

## ADDED Requirements

### Requirement: Recover an interrupted candle stream
The market-data service MUST detect an unexpected disconnect or transport error for an active exchange stream and attempt to reconnect automatically.

#### Scenario: Reconnect after a dropped WebSocket
- **WHEN** an active Binance candle stream closes unexpectedly
- **THEN** the service enters reconnecting state and retries using bounded backoff
- **AND** the service does not require a browser refresh or frontend-initiated polling

### Requirement: Backfill the missed candle range
After reconnecting, the service MUST request candles strictly after the last accepted cursor and before resuming normal live publication.

#### Scenario: Candles were missed during downtime
- **GIVEN** the last accepted closed candle has open time `T`
- **WHEN** the stream reconnects and candles after `T` exist
- **THEN** the service obtains the missing range through the exchange adapter
- **AND** publishes the recovered candles in ascending open-time order
- **AND** resumes live delivery after the recovered range

### Requirement: Preserve deterministic, duplicate-free delivery
The service MUST identify candles by stream, symbol, timeframe, and open time, and MUST NOT publish the same candle identity more than once during a recovery sequence.

#### Scenario: Backfill overlaps buffered live data
- **GIVEN** a candle appears in both the historical response and the live buffer
- **WHEN** recovery merges the two sources
- **THEN** the candle is emitted once
- **AND** the resulting sequence remains ordered by open time

### Requirement: Bound recovery attempts
The service MUST enforce a maximum retry delay and retry-attempt ceiling, and MUST expose an explicit failed state when recovery cannot complete.

#### Scenario: Exchange remains unavailable
- **WHEN** all configured recovery attempts fail
- **THEN** the stream enters failed state
- **AND** the existing server-side error/notification path receives a recovery failure
- **AND** no unbounded retry loop or hanging request remains

### Requirement: Keep recovery behind architecture boundaries
Recovery MUST remain in the market-data service and exchange-adapter boundary. Strategies MUST NOT access WebSocket state, exchange APIs, or recovery cursors, and the frontend MUST consume server-pushed canonical candles without implementing backfill or retry logic.

#### Scenario: Strategy and UI consume recovered candles
- **WHEN** recovered candles are published
- **THEN** downstream consumers receive the same canonical candle contract as ordinary live candles
- **AND** neither strategy code nor React code performs exchange recovery or candle-gap calculation
