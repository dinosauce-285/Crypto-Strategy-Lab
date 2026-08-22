# Design

## Recovery boundary

Connection ownership stays inside the market-data service and its exchange adapter. The adapter exposes a reconnectable live stream and a historical candle query; it does not know about WebSocket clients, React, strategies, or persistence. The market-data service owns the recovery state machine and publishes the same canonical candle event during normal operation and recovery.

The recovery sequence is:

1. Accept only candles that pass the existing stream validation and advance the stream cursor.
2. On an unexpected close or transport error, mark the stream disconnected and schedule a retry using bounded exponential backoff with jitter.
3. Re-establish the live subscription.
4. Query candles strictly after the cursor and through the first live candle that is not earlier than the cursor. If the live subscription cannot provide a stable upper bound, query through the current exchange time and retain the live buffer while backfill runs.
5. Merge backfill and buffered live candles by stream key and candle open time, preferring one canonical value for duplicates.
6. Publish the merged candles in ascending open-time order, advance the cursor, and return to live mode.

The cursor is per symbol/timeframe stream and is based on the candle's exchange open time, not arrival time. An in-progress candle is not treated as permanently complete; recovery must follow the existing candle-finality rule so a reconnect cannot turn a partial candle into a historical duplicate.

## State and bounds

The stream state is explicit: `live`, `reconnecting`, `backfilling`, and `failed`. Retry count, next retry time, and the cursor are observable through structured logs/metrics. Backoff has a configured maximum and retry attempts have a configured ceiling. A failed stream reports an error to the existing server-side notification path and remains restartable by an explicit new subscription or service lifecycle action.

Recovery should not require a database write. The cursor and short live buffer are process-local, matching the in-process event-bus decision. A process restart starts a fresh subscription and obtains the current range from the exchange adapter.

## Failure handling

- If the historical query fails, keep the stream in bounded retry/backoff and do not publish an unverified gap as complete.
- If the requested gap exceeds the exchange's maximum range, split it into bounded historical queries.
- If Binance returns overlapping pages, deduplicate by stream key and open time.
- If a candle is malformed or violates ordering, reject it through the existing adapter validation and surface the stream error; do not let one bad record corrupt the cursor.

## Decisions to record

Before implementation, add an ADR in `docs/decisions/` covering the recovery state machine, cursor semantics, backfill source, and bounded retry policy. The ADR must compare direct client reconnect, server-owned reconnect, and persistence-backed recovery, and state the trade-offs.

## Verification

Use deterministic adapter fixtures for: no disconnect, one disconnect with a gap, overlap between backfill and buffered live candles, repeated transport failure, historical-query failure, and a gap larger than one request. Assert event order, no duplicates, cursor advancement, bounded retries, and the terminal error notification. Keep the UI test at the transport boundary: it should verify that server-pushed candles continue after recovery, without calculating recovery or backtest results in React.
