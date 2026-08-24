## MODIFIED Requirements

### Requirement: A watcher receives live trade prices for a pair

The system SHALL publish the latest trade of a pair to that pair's price topic as the
exchange reports it, carrying the price, the volume traded, the observation time, and
which side of the trade was the taker's (buy or sell).

#### Scenario: Price moves while a client watches

- **WHEN** a client subscribes to the price topic of `BTCUSDT`
- **AND** the exchange reports a trade
- **THEN** the client receives a price message carrying the pair, the price, the volume,
  the taker's side, and the observation time

#### Scenario: A watcher of another pair is unaffected

- **WHEN** the exchange reports a trade on `BTCUSDT`
- **AND** a client watches only `ETHUSDT`
- **THEN** that client receives nothing
