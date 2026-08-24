## 0. Decisions

- [x] 0.1 First pass (the 4-chart grid) — nothing to settle: no shared type/contract,
      schema, inter-module communication, dependency, or scoring rule changes.
- [x] 0.2 [0024](../../../docs/decisions/0024-realtime-ticks-carry-volume-and-buy-sell-side.md)
      — `MarketPrice` gains volume and buy/sell side, for `RecentTicks`.
- [x] 0.3 [0025](../../../docs/decisions/0025-tab-navigation-uses-react-router.md) — tab
      navigation is URL-routed via `react-router`, a new dependency.

## 1. Reusable pieces

- [x] 1.1 `apps/web/src/market/TimeframeSelect.tsx` — extract the timeframe button
      group out of `MarketPanel.tsx` (`{ value: Timeframe; onChange: (t: Timeframe) =>
      void }`), same markup, no behavior change.
- [x] 1.2 `MarketPanel.tsx` uses `TimeframeSelect` in place of its inline block.
- [x] 1.3 `CandleChart.tsx` drops its own `<section className="panel">`/`<h2>` chrome —
      it renders only the four-state body now. The fetch effect and live subscription
      are unchanged; `attachChart` itself changed shape (see 4.2 — the `firstPaintRef`
      approach from T06 wasn't safe once 4 instances mount into a grid at once).

## 2. The dashboard

- [x] 2.1 `apps/web/src/market/Dashboard.tsx` — 4 cells, one shared `pair` prop, each
      holding its own `Timeframe` state defaulting to `[5m, 15m, 1h, 4h]`; each cell
      renders `TimeframeSelect` + `CandleChart`.
- [x] 2.2 `apps/web/src/index.css` — `.dashboard-grid` (2x2, gap, narrow-viewport
      collapse to 1 column) and a shorter `.chart` height inside it so all 4 fit on
      screen. Tokens only.

## 3. Wire it in (first pass)

- [x] 3.1 `App.tsx` renders `<Dashboard pair={pair} />` instead of the single
      `<CandleChart pair={pair} timeframe={timeframe} />`.

## 4. Verify (first pass)

- [x] 4.1 `pnpm --dir apps/web lint`, `lint:ui`, `exec tsc -b`, `build` — all pass.
- [x] 4.2 In a real browser: default layout matches `[5m,15m]/[1h,4h]`; changing one
      cell's timeframe leaves the other three untouched; all four draw real candles;
      loading/empty/error states work independently per cell (confirmed by switching
      pair mid-backfill — some cells show "no history yet" while another already has
      data). **Caught and fixed a real bug**: all 4 charts rendered completely blank in
      the dev server (`pnpm dev`), while a production build (`vite build` + `preview`)
      rendered them fine — same code, same data. Traced it to React StrictMode's
      dev-only "mount, unmount, remount" safety check, which applies to callback refs
      too: the chart div only exists once data has arrived (`hasData`), so its ref
      callback fires for the first time in the same commit as the data arriving —
      exactly when StrictMode's remount simulation destroys and recreates that DOM
      node. The *first* chart instance received `setData` correctly (confirmed via
      instrumentation); the *second*, StrictMode-recreated instance — the one actually
      left on screen — never did, because nothing re-ran `setData` for it. Fixed by
      having `attachChart` paint from a `candlesRef` (the latest known candles) on every
      chart creation, not only reacting to `state` changes — so a chart paints itself
      correctly regardless of when in the effect/ref lifecycle it gets (re)created. This
      wouldn't have been caught by lint/build/tsc, and wouldn't have been caught by
      testing only the production build either.

## 5. Realtime ticks carry volume and side (second pass)

- [x] 5.1 `apps/api/src/market/binance-stream.adapter.ts` — `BinanceTrade` gains `q`
      (quantity) and `m` (isBuyerMaker); the trade handler derives `side` (`m ? 'sell' :
      'buy'`) and forwards `volume`.
- [x] 5.2 `apps/api/src/market/ports/exchange-stream.port.ts` — `PriceTick` gains
      `volume: string; side: 'buy' | 'sell'`.
- [x] 5.3 `packages/contracts/src/wire.ts` — `MessagePayloads[MarketPrice]` gains the
      same two fields; `pnpm build:contracts`.
- [x] 5.4 `apps/web/src/market/RecentTicks.tsx` — subscribes to `marketPriceTopic(pair)`
      via the existing `useTopic` hook, keeps the last 30 ticks, renders Time/Price/
      Volume/Type — Type coloured with the existing `.ok`/`.bad` tokens.

## 6. Navigation and layout (second pass)

- [x] 6.1 `apps/web/package.json` — add `react-router-dom`.
- [x] 6.2 `apps/web/src/layout/Navbar.tsx` — app name, `NavLink`s to `/realtime` and
      `/backtest`, two hand-drawn inline SVG icons (no icon library for two icons).
- [x] 6.3 `apps/web/src/layout/Header.tsx` — `{ title }` bar above each screen's body.
- [x] 6.4 `apps/web/src/market/PairSelect.tsx` — pair picker extracted out of the
      retired `MarketPanel.tsx`, same markup.
- [x] 6.5 `apps/web/src/market/Annotations.tsx` — empty placeholder panel; no
      strategy/signal data exists yet (T11+).
- [x] 6.6 `apps/web/src/screens/RealtimeScreen.tsx` — header, `PairSelect` + `Dashboard`
      in the main column, `RecentTicks` + `Annotations` in the side column, the T01
      system-check block moved down from `App.tsx`.
- [x] 6.7 `apps/web/src/screens/BacktestScreen.tsx` — header + placeholder ("Historical
      data — coming next").
- [x] 6.8 `App.tsx` becomes the router shell (`BrowserRouter` + `Navbar` + `Routes`:
      `/` → redirect to `/realtime`, `/realtime`, `/backtest`).
- [x] 6.9 `MarketPanel.tsx` deleted — only ever used from `App.tsx`.
- [x] 6.10 `apps/web/src/index.css` — full-width `.app-shell` (navbar + routed screen)
      replaces the centered single-page layout; `.screen-body` 2-column grid, collapsing
      responsively at the same breakpoints already established.

## 7. Verify (second pass)

- [x] 7.1 `pnpm --dir apps/api lint`, `exec tsc --noEmit`, `build`; `pnpm --dir apps/web
      lint`, `lint:ui`, `exec tsc -b`, `build` — all pass.
- [x] 7.2 In a real (headless) browser: `/` redirects to `/realtime`; nav link active
      states correct; clicking Backtest navigates, and reloading directly on
      `/backtest` keeps you there (confirms the URL, not just in-memory state, drives
      the tab); `RecentTicks` shows real ticks with correct buy(green)/sell(red)
      colouring within seconds of opening the page; the 4-chart dashboard is unaffected
      by the surrounding layout change; `Annotations` and `/backtest` show their
      placeholders; zero console errors; narrow-viewport (480px) layout collapses
      cleanly (navbar becomes a top bar, dashboard drops to one column).

## 8. Close the change

- [x] 8.1 `pnpm decision --check` passes (24 records, index in sync).
- [x] 8.2 `pnpm commit`.
- [x] 8.3 Move the T08 Trello card to Done.
