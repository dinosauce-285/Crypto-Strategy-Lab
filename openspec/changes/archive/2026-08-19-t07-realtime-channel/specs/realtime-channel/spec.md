## Purpose

One push channel from the server to the browser, addressed by topic string, so that
prices, leaderboard changes, search progress and loop state share a single delivery
mechanism instead of growing one each.

## ADDED Requirements

### Requirement: Every message is one envelope

Every message the server pushes SHALL be an object with exactly two fields, `type` and
`payload`, where `type` is a namespaced string. No other field SHALL appear in the frame.

#### Scenario: A message arrives

- **WHEN** the server publishes anything to a topic
- **THEN** the client receives `{ type, payload }` and nothing else
- **AND** `type` identifies the kind of message before the client inspects `payload`

### Requirement: A client subscribes and unsubscribes by topic string

The channel SHALL accept a subscription to any topic string and deliver to a client only
the messages published to topics it currently holds. Unsubscribing SHALL affect that
topic alone.

#### Scenario: Subscribed client receives

- **WHEN** a client subscribes to `market:BTCUSDT:5m` and a message is published to that topic
- **THEN** the client receives that message

#### Scenario: Unsubscribed client receives nothing

- **WHEN** a message is published to `market:BTCUSDT:5m`
- **AND** a connected client holds no subscription to it
- **THEN** that client receives nothing

#### Scenario: Two clients on one topic

- **WHEN** two clients hold `market:BTCUSDT:5m` and one message is published to it
- **THEN** both clients receive it

#### Scenario: Dropping one topic leaves the others

- **WHEN** a client holds `market:BTCUSDT:1m` and `market:BTCUSDT:5m` and unsubscribes from `market:BTCUSDT:1m`
- **THEN** it stops receiving `market:BTCUSDT:1m` messages
- **AND** it keeps receiving `market:BTCUSDT:5m` messages

### Requirement: The channel matches topics, it does not interpret them

The channel SHALL treat a topic as an opaque string. It SHALL NOT reject, rewrite or
validate the meaning of a topic, so a new kind of traffic is a naming convention rather
than a change to delivery code.

#### Scenario: An unrecognised topic is accepted

- **WHEN** a client subscribes to a topic no publisher uses
- **THEN** the subscription succeeds
- **AND** the client receives nothing on it

### Requirement: No state is sent on subscribe

The channel SHALL send nothing in response to a subscription. Only messages published
after the subscription takes effect SHALL be delivered; initial state comes over HTTP.

#### Scenario: Subscribing to a quiet topic

- **WHEN** a client subscribes to a topic
- **AND** nothing is published to it afterwards
- **THEN** the client receives no message, including no snapshot of current state

### Requirement: Delivery is best effort and subscriptions do not survive a connection

A message SHALL NOT be queued, retried or replayed for a client that is not connected at
the moment it is published. A client that reconnects SHALL hold no subscriptions until it
subscribes again.

#### Scenario: Published while disconnected

- **WHEN** a message is published to a topic while a client is disconnected
- **THEN** that message is not delivered to the client when it reconnects

#### Scenario: Reconnect starts empty

- **WHEN** a client reconnects after holding `market:BTCUSDT:5m`
- **THEN** it receives nothing on that topic until it subscribes again
