# T09 · Connection recovery

Task ID: **T09**  
Source: `docs/project-breakdown.html` — What to build (Slice 1: Realtime charts)  
Evidence in Brief: Section 32.4 ("if the connection to Binance drops... Reconnect? Retry? Are candles lost?"), Section 40 Question 7 ("When the WebSocket drops, reconnect automatically and backfill the candles that were missed").

## Why

The realtime market-data path must remain reliable when the WebSocket connection to Binance drops. A disconnected client must not silently lose candles or require a manual page refresh to recover missed market data. This provides continuous data stream integrity and fulfills the core resilience requirement of Section 40 Q7.

## Decisions

**Settled** — [0003](../../../docs/decisions/0003-in-process-event-bus.md) (in-process event bus for notification), [0017](../../../docs/decisions/0017-one-push-channel-addressed-by-topic.md) (one push channel addressed by topic), [0019](../../../docs/decisions/0019-the-push-channel-runs-on-socket-io.md) (Socket.IO for server push without frontend polling).

**To settle** — Server-owned reconnect state machine, cursor semantics, deduplication, and bounded gap backfill policy via ADR.

## What Changes

- Detect unexpected Binance WebSocket disconnects and reconnect using bounded exponential backoff with jitter.
- Maintain an in-memory cursor tracking the last accepted closed candle per active stream.
- On reconnection, query missing candles strictly between the cursor and the recovered live buffer via the exchange adapter's REST historical path.
- Deduplicate and sort recovered/buffered candles by open time before emitting canonical candle events.
- Maintain an explicit terminal failed state if reconnect attempts reach the maximum threshold, preventing unbounded loops.

## Capabilities

### New Capabilities
- `connection-recovery`: Handles automatic WebSocket reconnection, closed-candle cursor tracking, gap backfilling from Binance REST endpoint, and deduplicated live delivery.

### Modified Capabilities
*(None)*

## Impact

- `apps/api/src/market`: Market data service, Binance adapter, and realtime stream manager.
- `packages/contracts`: Shared events or error status types if recovery state notifications are exposed.
- `apps/web`: Frontend receives uninterrupted server-pushed candles; no recovery or gap maths in React.
