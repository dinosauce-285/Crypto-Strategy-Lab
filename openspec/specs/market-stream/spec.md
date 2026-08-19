# market-stream Specification

## Purpose

Live trade prices and closed candles for a trading pair, taken from the exchange and
delivered to whoever is watching that pair, so a screen showing market data never asks
for it twice.

## Requirements

### Requirement: A watcher receives live trade prices for a pair

The system SHALL publish the latest trade price of a pair to that pair's price topic as
the exchange reports it, carrying the price and the time it was observed.

#### Scenario: Price moves while a client watches

- **WHEN** a client subscribes to the price topic of `BTCUSDT`
- **AND** the exchange reports a trade
- **THEN** the client receives a price message carrying the pair, the price and the observation time

#### Scenario: A watcher of another pair is unaffected

- **WHEN** the exchange reports a trade on `BTCUSDT`
- **AND** a client watches only `ETHUSDT`
- **THEN** that client receives nothing

### Requirement: A watcher receives candles as they close

The system SHALL publish a candle to the topic of its pair and timeframe when the
exchange closes it, and SHALL NOT publish a candle still forming. Prices and candles are
separate kinds of message and SHALL NOT be merged into one.

#### Scenario: A candle closes

- **WHEN** a client subscribes to `market:BTCUSDT:1m`
- **AND** the 1m candle closes on the exchange
- **THEN** the client receives one candle message for that candle
- **AND** the candle is marked closed

#### Scenario: A forming candle is not published

- **WHEN** the exchange reports an update to a candle that has not closed
- **THEN** no candle message is published for it

#### Scenario: One timeframe does not deliver another

- **WHEN** a client holds `market:BTCUSDT:1m` only
- **AND** a 5m candle closes
- **THEN** the client receives nothing for it

### Requirement: Several watchers of one pair cost one upstream connection

The system SHALL hold at most one upstream connection per pair regardless of how many
clients are watching it, and SHALL close that connection when the last watcher of the
pair goes away.

#### Scenario: A second watcher joins

- **WHEN** one client is watching `BTCUSDT` and a second client subscribes to the same pair
- **THEN** no second upstream connection is opened
- **AND** both clients receive the same prices

#### Scenario: The last watcher leaves

- **WHEN** the only client watching `BTCUSDT` unsubscribes or disconnects
- **THEN** the upstream connection for `BTCUSDT` is closed

### Requirement: Nothing outside the adapter knows which exchange this is

A candle or price leaving this capability SHALL use the shared `Candle` and price shapes
from the contracts package. Exchange-specific field names, encodings or symbols SHALL NOT
appear in a delivered message.

#### Scenario: A candle is delivered

- **WHEN** a candle message reaches a client
- **THEN** its payload matches the `Candle` contract
- **AND** it carries no exchange-specific field

### Requirement: A watcher sees the market move without reloading

A screen watching a pair and timeframe SHALL show the latest price and the candles that
have closed since it connected, updating in place. It SHALL show a distinct state while
connecting, when nothing has arrived yet, and when the stream cannot be reached, and the
error state SHALL say what to do about it.

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
