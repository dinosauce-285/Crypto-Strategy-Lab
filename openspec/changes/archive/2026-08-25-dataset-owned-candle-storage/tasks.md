## 0. Decisions

- [x] 0.1 docs/decisions/0040-realtime-watched-candles-are-read-live-from-the-exchange-not.md — realtime-watched candles are read live, not persisted
- [x] 0.2 docs/decisions/0041-dataset-creation-fetches-and-stores-its-own-candle-range-fro.md — Dataset creation fetches and stores its own candle range, paginated

## 1. ExchangeHistoryPort gains a paginated range fetch

- [x] 1.1 `ports/exchange-history.port.ts` — add `fetchRange(pair, timeframe, from, to): Promise<Candle[]>`.
- [x] 1.2 `binance-rest.adapter.ts` — implement `fetchRange` by paginating `klines` in
      ≤1000-row chunks, bounded by `to` (never `Date.now()`), reusing
      `MarketService.recoverGaps()`'s loop shape (advance `startTime` past the last
      row in a chunk, stop on a short/empty chunk).
- [x] 1.3 Same method — add a ~150-200ms delay between chunk requests, and on a 429
      response read `Retry-After`, wait exactly that long, retry once, then throw a
      real error if it fails again. No retry loop beyond that one retry.

## 2. Dataset creation triggers the fetch

- [x] 2.1 `ports/candle-backfill.port.ts` (new) — abstract `CandleBackfillPort` with
      `ensureRange(pair, timeframe, from, to): Promise<void>`.
- [x] 2.2 `candle-backfill.service.ts` (new) — implements it: calls
      `ExchangeHistoryPort.fetchRange` then `CandleRepository.upsertMany`.
- [x] 2.3 `market.module.ts` — provide and export `CandleBackfillPort`.
- [x] 2.4 `search/backtest.service.ts` — inject `CandleBackfillPort`; in
      `createDataset()`, await `ensureRange(dataset.pair, dataset.timeframe,
      dataset.from, dataset.to)` after `this.datasets.create(data)` and before
      returning. Propagate a fetch failure as a real error — do not return a Dataset
      backed by an incomplete or failed fetch. (Also applied to `runSingle`'s
      inline-create branch via a shared `createDatasetWithHistory` helper, so no path
      can hand back a Dataset with no data behind it.)

## 3. Realtime tab reads live instead of storage

- [x] 3.1 `market.service.ts` — add `getLiveHistory(pair, timeframe, limit)` calling
      `ExchangeHistoryPort.fetchKlines` directly, no Postgres.
- [x] 3.2 `market.controller.ts` — `GET /market/candles` calls `getLiveHistory` when
      `from`/`to` are absent; the `from`/`to` branch is unchanged (still
      `MarketService.getHistory` → `CandleRepository.range`, storage-only per `0026`).
- [x] 3.3 `market.service.ts` — removed the `upsertMany(history)` backfill-and-store
      branch (formerly in `ensureHistoryAndCursor`, renamed `seedCursor`). Cursor
      seeding is now a single `fetchKlines(pair, timeframe, 1)` call, reused in
      `recoverGaps()`'s own fallback (it previously read Postgres for the same thing).
- [x] 3.4 Grepped `apps/api/src` for other subscribers to `EVENTS.CandleClosed` —
      `CandleRepository.onCandleClosed` was the only one; `emitCandle()`'s channel
      publish (the live push to the browser) is a separate call, confirmed unaffected.
- [x] 3.5 `candle.repository.ts` — removed the `@OnEvent(EVENTS.CandleClosed)`
      persistence listener and the now-unused singular `upsert`/`hasHistory` methods
      (no remaining callers). Kept `upsertMany`, reused by `CandleBackfillService`.

## 4. Verify

- [x] 4.1 `pnpm --dir apps/api lint`, `exec tsc --noEmit`, `build` — all clean. Full
      `pnpm build` (contracts + api + web) also clean. `pnpm --dir apps/api test` —
      42 suites, 237 tests, all passing (updated `market.service.spec.ts`'s
      `ExchangeHistoryPort`/`CandleRepository` mocks and `backtest.service.spec.ts`'s
      constructor arg list + added a test asserting `createDataset` calls
      `CandleBackfillPort.ensureRange`).
- [x] 4.2 Live, real browser (headless Playwright, later session): opened Realtime,
      confirmed all 4 charts (5m/15m/1h/4h) load and stream real candle data, and the
      "Kiểm tra hệ thống" panel confirmed API/Postgres/Event bus all reachable —
      screenshot on file. Combined with 4.6's direct-Postgres proof that watching
      writes nothing, this closes the item.
- [x] 4.3 Live: created a Dataset for BNBUSDT/15m (zero rows previously stored for
      that pair/timeframe) via `POST /api/datasets`, then ran `POST /api/backtest/run`
      against it — returned 20 real trades, real metrics, 1152 real candles. Confirms
      the exact scenario that was silently broken before this change.
- [x] 4.4 Live: same BNBUSDT/15m Dataset spanned a 12-day range = 1152 candles > 1000,
      forcing 2 paginated chunks. Verified via Postgres: all 1152 candles stored,
      correct min/max open time bounds, no gaps or duplicates. Total request time
      ~2s (well under the ~15-20s estimate for a much larger month-at-1m range). No
      429s.
- [x] 4.5 Confirmed: `GET /market/candles` limit-only response is still exactly
      `{ candles: Candle[] }`, same fields, same shape — just Binance-backed now.
- [x] 4.6 Confirmed via direct Postgres queries: hit the live limit-only endpoint 3x
      for XRPUSDT (1m/5m/15m, never touched before) — 0 rows before, 0 rows after,
      despite real candles being returned each time. Total table row count only grew
      by exactly the 1152 rows the BNBUSDT Dataset fetch added — nothing else touched
      the table.
- [x] 4.7 After merging `dev` (which archived `t06-historical-candles`,
      `t08-4-chart-dashboard` and `historical-candles-date-range` into a real
      `openspec/specs/candle-history/` capability), re-ran `openspec validate --strict`
      and found two of its requirements directly contradicted this change
      ("backfilled on first watch," "storage-only, never live"). Added a
      `candle-history` delta (REMOVE the backfill requirement, MODIFY the storage-only
      and watcher-sees-history requirements, MODIFY the Backtest tab's static-chart
      empty-state reasoning) and added `candle-history` to the proposal's Modified
      Capabilities. Validates clean.

## 5. Close the change

- [x] 5.1 `pnpm decision --check` — 41 records, index in sync.
- [x] 5.2 `openspec validate dataset-owned-candle-storage --strict` — valid.
- [x] 5.3 Committed, pushed, PR #29 opened and merged to `dev`.
- [x] 5.4 A follow-up bug (BUG-04, `docs/bug-ledger.vi.html`) surfaced after merge:
      `CandleRepository.upsertMany` batched an entire fetched range into one Prisma
      `$transaction`, which exceeded the default 5000ms timeout for wide/fine-grained
      ranges (e.g. 14 days at `1m`, ~20k candles) — exactly the case this change
      exists to serve. Fixed in PR #34 (chunked into 500-candle transactions); no
      behavior or spec change, pure reliability fix. Live-verified: the same 14-day/1m
      shape now returns HTTP 201 with all candles persisted.
