# Realtime-watched candles are read live from the exchange, not persisted

## Why this

`0023` tied two things together that don't actually need each other: backfilling a
pair/timeframe on first watch, and persisting it forever afterward. The persistence
half was there to serve backtesting — `0023`'s own reasoning is entirely about T19's
rate limit and Iron Rule 7's reproducibility guarantee, neither of which the Realtime
tab needs. A chart being looked at right now doesn't need to be replayable next month.

`0032` already made this exact argument once, for the reconnect cursor specifically:
its rejected "database-backed stream cursor" alternative says persisting every stream
tick "creates write contention and storage bloat for transient UI viewing without
architectural benefit... process memory is fast, isolated, and sufficient." That
reasoning doesn't stop at the cursor — it applies just as well to the candles
themselves. Nothing about showing someone a live chart requires keeping the data
around after they close the tab.

With no retention policy anywhere in the system, the practical consequence of tying
persistence to watching was a `Candle` table with no upper bound: it grows for as long
as anyone leaves a pair open, whether or not that data is ever backtested. Now that
`0041` gives Dataset creation its own explicit, scoped fetch, persistence has a real
owner — a Dataset — and Realtime watching goes back to being what `0032` always treated
it as: a transient view, served live.

`GET /market/candles`'s "most recent N" mode (no `from`/`to`) now calls
`ExchangeHistoryPort.fetchKlines` directly. The `from`/`to` range mode is untouched —
that's `0026`'s storage-only invariant, still true, still serving Dataset-backed reads.
Live ticks and candle closes keep streaming over the same WebSocket channel (`0017`,
`0019`) exactly as before; only the database write on each close is removed.

## What else we looked at

**Keep persisting, add a retention/pruning job instead.** Bounds the growth without
touching the read path. Rejected because it solves the wrong problem: the data being
pruned was never needed for viewing in the first place, and pruning candles a Dataset
might still reference (even one with no Experiments yet) risks exactly the
reproducibility failure `0023`'s Iron Rule 7 exists to prevent. Not persisting
unwatched, unbacktested data at all is simpler than persisting it and later deciding
whether it's safe to delete.

**Keep the current backfill-on-watch behavior, let Datasets read whatever's already
there.** The status quo. Rejected because it's exactly the bug this whole change
started from: a Dataset's data availability becomes an accident of Realtime browsing
history instead of a deliberate request, and storage grows for reasons nobody chose.

## Trade-offs

Every Realtime tab open now costs one REST call to Binance instead of a Postgres read
— slightly higher latency on first paint, and a small, ongoing piece of the request
budget that scales with how many people have the tab open, not with how much has been
backfilled once. At current usage this is nowhere near Binance's rate limit (see
`0041`'s weight math), but it's a different cost shape than before and worth watching
if concurrent viewers ever grow much.

The reconnect gap-repair cursor (`0032`) now seeds itself from a single cheap
`fetchKlines(pair, timeframe, 1)` call instead of reading a pre-existing backfill row.
If a client disconnects before that seed call resolves, gap-repair has nothing to
repair from until the next live candle arrives — an edge case `0032` didn't have to
consider before, because a backfilled row was always already there.
