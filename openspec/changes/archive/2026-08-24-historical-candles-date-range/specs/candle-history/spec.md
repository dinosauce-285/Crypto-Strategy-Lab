## ADDED Requirements

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
