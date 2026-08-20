## 0. Decisions

- [x] 0.1 [0021](../../../docs/decisions/0021-historical-candles-are-drawn-with-lightweight-charts.md)
      — the chart is drawn with `lightweight-charts`, the only chart library for the
      whole app (`apps/web/docs/UI_CONSTRAINT.md`), so T08's dashboard inherits it.
- [x] 0.2 [0022](../../../docs/decisions/0022-backfill-is-1000-candles-per-pair-and-timeframe-fetched-lazi.md)
      — backfill is 1000 candles per pair/timeframe, fetched lazily on first watch, not a
      pre-seeded pair list.

## 1. Backfill and storage

- [x] 1.1 `apps/api/src/market/binance-rest.adapter.ts` — fetch historical klines from
      Binance's REST API for a pair, timeframe and range; normalise into `Candle` the same
      way `binance-stream.adapter.ts` does (decimal strings, `closed: true` only).
- [x] 1.2 `apps/api/src/market/candle.repository.ts` — the only place touching
      `PrismaService` for candles: upsert on `(pair, timeframe, openTime)`, and read a
      stored range. Services never touch `PrismaService` directly (`BACKEND_CONSTRAINT.md`).
- [x] 1.3 Wire `candle.repository.ts` as a listener on the `CandleClosed` event
      `market.service.ts` already emits, so every closed candle — live or backfilled — is
      persisted the same way.
- [x] 1.4 In `market.service.ts` (or a small addition beside it), trigger a backfill
      through the REST adapter the first time a pair/timeframe is watched and has no
      stored history, per the scope locked in 0.2. Do not re-fetch a pair/timeframe that
      already has history.
- [x] 1.5 Verified live against a dedicated `crypto_strategy_lab` Postgres container (see
      note below — `ai_erp_db`'s usual port 5432 was occupied by an unrelated container on
      this machine, so this project got its own on 5433): subscribed to `market:BTCUSDT:1m`
      via `scripts/ws-probe.mjs`, confirmed exactly 1000 rows landed in `Candle` (matching
      ADR 0022's ceiling); re-subscribed and confirmed the row count stayed at 1000 (no
      second REST call, `hasHistory` short-circuit works).

## 2. The history endpoint

- [x] 2.1 DTOs for the request (pair, timeframe, range) and response (list of candles) —
      in `dto/`, or `@csl/contracts` if the frontend needs the same shape.
- [x] 2.2 `apps/api/src/market/market.controller.ts` — `GET /market/candles`, HTTP only,
      calls the service, returns the DTO. No logic, no database access here
      (`BACKEND_CONSTRAINT.md`).
- [x] 2.3 `market.service.ts` gains a read method that goes through the repository and
      returns candles for a range, serving from storage only — no live exchange call on a
      read.
- [x] 2.4 `market.module.ts` registers the controller and exports what it needs; it
      currently exports nothing (T07 left it that way on purpose, for this task).
- [x] 2.5 Verified: `GET /market/candles?pair=BTCUSDT&timeframe=1m` returned 1000
      correctly-shaped, ascending-order candles; `limit` clamps; an unwatched pair
      (`ETHUSDT`) returned `{"candles":[]}` (200, not an error) rather than failing; an
      invalid `timeframe` returned a 400 naming the valid set.

## 3. The history chart

- [x] 3.1 Add the charting library chosen in 0.1 to `apps/web/package.json`.
- [x] 3.2 A chart component in `apps/web/src/market/` that fetches the history endpoint on
      mount for the selected pair/timeframe, renders it, then subscribes to
      `marketCandleTopic` via the existing `useTopic` hook (same pattern as
      `MarketPanel.tsx`) to append newly closed candles without a reload.
- [x] 3.3 All four states per `UI_CONSTRAINT.md`: loading (history fetch in flight), empty
      (no stored history yet), error (endpoint unreachable, says what to do), and has-data.
      Colours from tokens, not raw values.
- [x] 3.4 Mount the chart on a screen (or alongside `MarketPanel`, whichever the current
      routing supports) so it is reachable, not just a component nobody renders. Lifted
      `pair`/`timeframe` state into `App.tsx` so `MarketPanel` and `CandleChart` share one
      selector instead of two.
- [x] 3.5 Verified in a real (headless) browser against the live stack: the chart drew
      1000 candles immediately on load; stopping the API produced the error state with a
      retry button, not a blank grid; switching to an unwatched pair/timeframe produced the
      empty state, not a blank grid; a live candle closed while the page was open and was
      appended without a reload. **Caught and fixed a real bug this way**: `series.setData()`
      alone did not bring the new data into the chart's visible time range — the chart
      rendered but showed nothing until `chart.timeScale().fitContent()` was added, called
      once per chart instance on its first paint only (a `firstPaintRef` guard), so a later
      live-candle append doesn't yank the view back after the user pans/zooms. This would
      not have been caught by lint/build/tsc or by curling the API alone.

## 4. Close the change

- [x] 4.1 `pnpm --dir apps/api lint`, `exec tsc --noEmit`, `build`; `pnpm --dir apps/web
      lint`, `lint:ui`, `build`. Both apps, not one. All six pass clean.
- [x] 4.2 `pnpm decision --check` passes for both records from group 0.
- [x] 4.3 `docs/decisions/README.md` — add the two new records to the index (the
      `pnpm decision` command does this automatically; confirm the lines are there).
- [ ] 4.4 `pnpm commit`, then push — the gate wants the decision records in the same push
      as the contract, schema or module changes that assume them. **All prior tasks now
      verified — ready, not yet done pending explicit go-ahead.**
- [ ] 4.5 Move the T06 Trello card to Done.
