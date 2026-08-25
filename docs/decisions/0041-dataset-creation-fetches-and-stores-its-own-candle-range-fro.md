# Dataset creation fetches and stores its own candle range from the exchange, paginated

## Why this

`0026` deliberately left this open: "filling a specific gap on purpose (a 'load more
history' action) is a real feature, but a different one, for whoever builds the screen
that needs it." Since then, `0040` removed the one path that used to accidentally
cover some of this — Realtime watching no longer persists anything — so a Dataset with
a date range outside what's already stored now has no way to ever get real data. This
is that feature.

`ExchangeHistoryPort.fetchKlines(pair, timeframe, limit)` only ever sends `limit`; it
has no way to ask for a specific window. Binance's own `/api/v3/klines` already
supports `startTime`/`endTime` — `ExchangeStreamPort.fetchCandles` proves this out
today, used by `MarketService.recoverGaps()` to page through a reconnect gap in
≤1000-row chunks (Binance's per-call cap). That loop is the template: `fetchRange`
does the same thing, bounded by the Dataset's own `to` instead of `Date.now()`.

Two rate-limit rules, kept deliberately small: a ~150-200ms delay between chunk
requests, and on a 429, read `Retry-After`, wait exactly that long, retry once, then
fail for real. The actual numbers don't justify more: a worst-case Dataset (a month at
1m, 44 calls) costs ~220 request weight against Binance's 6,000/minute budget — under
4%. What does justify something is the shape of Binance's penalty: a 429 you ignore
escalates to an IP ban (418) that scales 2 minutes to 3 days per repeat offense, and
that ban would take down the live Realtime stream too, not just this feature. The two
rules exist to make that failure mode survivable, not to manage a budget under real
pressure.

The fetch runs inline in `POST /datasets`, not through BullMQ. `0004`'s job queue
exists for the search loop's many independent, retryable, pausable units of work — a
different shape of problem than one bounded fetch for one Dataset. `recoverGaps()`
already sets the precedent: a multi-call paginated Binance fetch, awaited inline, no
queue. If it fails, the caller sees a real error and can just try again — `create()`'s
upsert and `upsertMany`'s upsert are both already idempotent, so a retry costs nothing
extra.

## What else we looked at

**Queue it through BullMQ, like a search candidate.** Gets retries, pause/resume, and
progress observability for free. Rejected: those are solved problems for one bounded,
user-triggered fetch that already has a trivial retry story (recreate the Dataset).
Adding a queue here is exactly the kind of technology-without-a-driver the brief's
§38 warns against.

**Push progress over the WebSocket channel, mirroring `SearchProgressPanel`.** Real UX
improvement for a 10-20 second wait. Deferred, not rejected outright — the team
already said the current block-and-wait `Creating…` state (the same pattern
`BacktestScreen` already uses) is an acceptable wait. Worth revisiting if datasets
start regularly requesting much wider ranges.

**Diff against what's already stored, fetch only the missing part.** Real savings when
ranges overlap. Deferred as a later optimization — `upsertMany`'s upsert semantics
already make a naive full re-fetch harmless, just not maximally efficient.

**Track Binance's `X-MBX-USED-WEIGHT-1M` header and self-throttle against it.** More
robust than a fixed delay. Rejected for now — at ~4% of budget per Dataset, there's
nothing this would currently protect against that the fixed delay doesn't already
cover, and it's real infrastructure (shared state, coordination across callers) for a
problem that doesn't exist yet.

## Trade-offs

A wide-range Dataset now makes `POST /datasets` a genuinely slow request (10-20+
seconds for a month at 1m) instead of an instant write. The modal blocks for that
whole window with only static "Creating…" text — acceptable today, but it's a real
UX cost that grows with how wide a range someone asks for, and there's no cap yet on
how wide a single request can be.

Dataset creation now depends on Binance being reachable at creation time. A Dataset
that used to always succeed (pure metadata) can now fail outright if the exchange is
down or rate-limited — a new failure mode `DatasetFormModal`'s existing error-and-retry
UI happens to already handle, but it's a real behavior change from "this never fails."

This closes the read side of `0026`'s deferred question but leaves its own trade-off
in place: a caller still can't tell "genuinely thin range" from "not backfilled that
far back" from the read endpoint alone. It no longer matters for Dataset-driven reads,
since Dataset creation now guarantees its own range is fetched — but it still applies
to anyone reading `GET /market/candles` with `from`/`to` directly, outside a Dataset.

Dataset deletion isn't part of this change — none exists in the app today — but it's
worth recording here since this makes Dataset rows more expensive to create: a Dataset
with any Experiment against it already can't be deleted, enforced at the database
level (`Experiment_datasetId_fkey ... ON DELETE RESTRICT`, `Trade`'s own relation to
`Experiment` is the only one that cascades). Whoever eventually builds dataset deletion
should not override that with a cascade.
