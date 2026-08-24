## Why

Candle storage today is a side effect of casually watching a pair on the Realtime tab
(`0023`): first watch backfills 1000 candles, every closed candle after that persists
forever, for as long as anyone leaves it watched. Nothing prunes it, so the `Candle`
table grows without bound for data nobody may ever backtest. Meanwhile creating a
Dataset — the thing that actually needs candle data — fetches nothing; it's pure
metadata, so a Dataset outside whatever happened to already be backfilled silently
returns partial or empty candles (`0026`), and the backtest just looks like "no
trades," not "no data." This closes the long-open Trello gap card ("Backtest: fetch a
specific historical range from the exchange on demand") by giving persistence a real
owner — a Dataset's own explicit request — instead of an accident of browsing history.

## Decisions

**Settled** — [0023](../../../docs/decisions/0023-backfill-is-1000-candles-per-pair-and-timeframe-fetched-lazi.md)
established the rate-limit and reproducibility reasoning this change re-homes rather
than discards. [0026](../../../docs/decisions/0026-historical-candles-are-queryable-by-an-explicit-date-range.md)
left "load more history" as a deliberately deferred, separate feature — this is that
feature, and its storage-only invariant for `from`/`to` reads is untouched.
[0032](../../../docs/decisions/0032-server-owned-reconnect-and-gap-backfill.md) already
argued live-viewing doesn't need database persistence, for the reconnect cursor
specifically — this extends that same argument to the candles themselves.
[0004](../../../docs/decisions/0004-bullmq-for-backtests.md) settled BullMQ for the
search loop's many independent, retryable jobs, a different shape of problem than the
one bounded fetch this change adds.

**To settle** — Two, both written: `0040` (realtime-watched candles are read live, not
persisted) and `0041` (Dataset creation fetches and stores its own candle range,
paginated, with the rate-limit discipline that entails).

## What Changes

- `ExchangeHistoryPort` gains `fetchRange(pair, timeframe, from, to)`, implemented in
  `BinanceRestAdapter` by paginating Binance's `klines` endpoint in ≤1000-row chunks
  (bounded by `to`), with a small delay between chunks and `Retry-After`-honoring
  single-retry-then-fail on a 429.
- A new `CandleBackfillPort`, exported by the market module, gives Dataset creation a
  way to trigger that fetch without reaching into the market module's concrete
  classes. `BacktestService.createDataset` awaits it before returning — a wide-range
  Dataset now takes real time (~10-20s) to create, and fails visibly if the fetch
  fails, instead of always succeeding instantly as empty metadata.
- `GET /market/candles`'s "most recent N" mode (no `from`/`to` — what `CandleChart`
  calls on every mount) now reads live from `ExchangeHistoryPort.fetchKlines` instead
  of Postgres. The `from`/`to` range mode is unchanged, still storage-only.
- `MarketService` stops persisting watched candles: the `upsertMany` backfill-on-watch
  is removed, and the reconnect-gap-repair cursor now seeds from one cheap
  `fetchKlines(pair, timeframe, 1)` call instead of a stored backfill row.
  `CandleRepository` stops listening for `CandleClosed` to persist it.
- Dataset deletion needs no change — already `ON DELETE RESTRICT` at the database
  level for any Dataset with Experiments, and no delete endpoint exists in the app.
  Recorded in `0041`'s trade-offs so it isn't discovered by accident later.

## Capabilities

### New Capabilities
- `dataset-history`: creating a Dataset fetches and stores exactly the candle range it
  declares, from the exchange, paginated.

### Modified Capabilities
- `market-stream`: reading a pair's recent candles no longer depends on prior
  watch history being backfilled into storage — it reads live from the exchange on
  every request, which also means it now depends on the exchange being reachable at
  read time (previously resilient to exchange downtime once backfilled).
- `candle-history`: this capability archived onto `dev` (via `t06-historical-candles`,
  `t08-4-chart-dashboard` and `historical-candles-date-range`) after this change's
  decisions were written, and two of its requirements directly assumed the behavior
  `0040` removes — "a pair/timeframe is backfilled on first watch" (removed outright)
  and "a closed candle is available from storage, not the exchange" (narrowed to the
  explicit `from`/`to` case only, since the default "most recent N" mode no longer
  holds it). The Backtest tab's static-chart requirement is also updated: its empty
  state is now explained by "no Dataset covers this range" rather than "never watched
  on Realtime," since watching no longer stores anything at all.

## Impact

- `apps/api/src/market/ports/exchange-history.port.ts`,
  `apps/api/src/market/binance-rest.adapter.ts`,
  `apps/api/src/market/ports/candle-backfill.port.ts` (new),
  `apps/api/src/market/candle-backfill.service.ts` (new),
  `apps/api/src/market/market.module.ts`, `market.service.ts`, `market.controller.ts`,
  `candle.repository.ts`.
- `apps/api/src/search/backtest.service.ts`, `search.module.ts`.
- No `packages/contracts` change — `Candle`/`GetCandlesResponseDto` shapes are
  unchanged, only what backs them.
- No frontend change required — `CandleChart.tsx`'s fetch and `useTopic` subscription,
  and `DatasetFormModal.tsx`'s existing loading/error UI, already match the new
  behavior byte-for-byte.
- Card: found in conversation, not one of T01–T29 — the same untitled Trello card
  `historical-candles-date-range` named as its own follow-up
  (https://trello.com/c/p57I5uIZ/31-backtest-fetch-a-specific-historical-range-from-the-exchange-on-demand).
