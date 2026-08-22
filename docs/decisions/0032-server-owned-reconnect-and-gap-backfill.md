# Server-owned reconnect and gap backfill

## Why this

Realtime WebSocket streams to exchanges occasionally drop due to network blips or exchange maintenance. When this happens, downstream consumers (charts, indicator calculations, strategy runners) must not silently drop candles or require user intervention (brief section 32.4 and section 40 question 7).

We place reconnection, cursor tracking, and backfill entirely on the server within the `market` module:
1. **In-memory cursor**: The market data service tracks the `openTime` of the last closed candle per `(pair, timeframe)` stream.
2. **Bounded reconnect**: On WebSocket disconnect or transport failure, the adapter automatically retries with exponential backoff and jitter up to a configured retry limit, preventing unbounded connection loops.
3. **Historical gap backfill**: Upon re-establishing the live stream, missing candles between the cursor and the current live buffer are fetched via the exchange's REST historical endpoint (`/api/v3/klines`).
4. **Chronological deduplication & merge**: Recovered historical candles and buffered live candles are deduplicated by `openTime`, sorted chronologically, and emitted through the standard candle event path (`EVENTS.CandleClosed` and `market.candle` push topic).

This ensures consumers receive a clean, uninterrupted, duplicate-free stream of canonical candles without knowing or caring that a disconnect occurred.

## What else we looked at

**Frontend-managed recovery** — having the React app detect a stream stall, calculate missing ranges, and request backfills via HTTP. This lost because it directly violates Iron Rule 5 (no business logic in frontend) and Iron Rule 6 (frontend never polls; server pushes). Placing recovery in the UI would duplicate recovery logic across every client and leak exchange timing nuances to the browser.

**Database-backed stream cursor** — persisting every received candle and cursor position into PostgreSQL. This lost because realtime active streams are ephemeral subscriptions driven by active viewers (ADR 0020). Writing every stream tick to the database creates write contention and storage bloat for transient UI viewing without architectural benefit. Process memory is fast, isolated, and sufficient; fresh connections simply initialize from current exchange time.

## Trade-offs

- Process restarts lose the transient in-memory cursor. When the API restarts, active client subscriptions re-subscribe and receive the latest historical candles directly from the historical endpoint.
- The exchange adapter must provide both a WebSocket streaming port and a REST historical fetching method, coupling adapter design to exchange-specific REST kline limits (which require pagination if the outage window exceeds single-request limits).
