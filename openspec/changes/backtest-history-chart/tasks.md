## 0. Decisions

- [x] 0.1 No new ADR — applies ADR 0026 (range endpoint) and ADR 0022 (chart library)
      as-is, adds nothing to either.

## 1. BacktestChart

- [x] 1.1 `apps/web/src/market/BacktestChart.tsx` — one fetch of
      `GET /market/candles?pair=&timeframe=&from=&to=` on mount and on pair/timeframe
      change, no live subscription. Default window per timeframe, computed client-side
      (`now - windowMs` → `now`), same spirit as `CandleChart`'s `DEFAULT_WINDOW`.
- [x] 1.2 Four states: loading, error (with retry), empty ("no history yet" — explains
      that a range request never backfills, unlike the Realtime tab), and data
      (`lightweight-charts` candlestick, `fitContent()` once on first paint).

## 2. BacktestScreen

- [x] 2.1 Replace the placeholder with `Header` + `PairSelect`/`TimeframeSelect`
      (reused, local state) + `BacktestChart`, full-width single chart, no sidebar.

## 3. Verify

- [x] 3.1 `pnpm --dir apps/web lint`, `lint:ui`, `build`.
- [x] 3.2 Browser: BTCUSDT/1h (already backfilled from Realtime) shows its chart;
      SOLUSDT/1d (never watched) shows the empty state, not a blank grid. Zero console
      errors either way.

## 4. Close the change

- [x] 4.1 `openspec validate backtest-history-chart --strict`.
- [ ] 4.2 Commit (multiple, by logical part), push, open a PR.
