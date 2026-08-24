## Why

T06 gave Slice 1 one historical chart; Slice 1 doesn't close until it has the screen the
brief actually asks for — four charts of one pair, each on its own timeframe, visible at
once, so a trader reads a pair across multiple horizons without switching screens
(T08's card: "take the single chart from T06 up to four, plus a pair selector; each
chart switches timeframe independently").

This change grew in two passes. The first built the 4-chart grid itself. The second —
directed beyond the Trello card's literal text, by the task owner — gives it the real
screen it lives on: a left navbar, URL-addressable Realtime/Backtest tabs, a live trade
tape (`RecentTicks`), and a reserved spot for future chart annotations. Both passes are
one change because they're the same question — what does Slice 1's realtime screen look
like — asked twice.

## Decisions

**Settled** — [0022](../../../docs/decisions/0022-historical-candles-are-drawn-with-lightweight-charts.md)
the chart library; [0023](../../../docs/decisions/0023-backfill-is-1000-candles-per-pair-and-timeframe-fetched-lazi.md)
backfill scope — four simultaneous timeframes is four instances of a path that already
exists per timeframe, not a new backfill shape. [0017](../../../docs/decisions/0017-one-push-channel-addressed-by-topic.md)
the push channel's message shape is for the screen, not the exchange — the reasoning
`0024` (below) extends.

**To settle** — Two, from the second pass (the first pass settled nothing new):
[0024](../../../docs/decisions/0024-realtime-ticks-carry-volume-and-buy-sell-side.md)
`MarketPrice` gains volume and buy/sell side, for `RecentTicks`. [0025](../../../docs/decisions/0025-tab-navigation-uses-react-router.md)
tab navigation is URL-routed via `react-router`, a new dependency.

## What Changes

- A 2x2 dashboard of 4 charts, one shared pair, each with its own timeframe selector —
  default layout `[5m, 15m] / [1h, 4h]`.
- `CandleChart` loses its own panel/header chrome so it can be reused four times without
  four duplicate headers; the chrome moves to whichever screen hosts it.
- A `TimeframeSelect` control and a `PairSelect` control, each extracted once and reused
  everywhere a pair or timeframe is picked, instead of hand-rolled copies.
- A left navbar (app name, Realtime/Backtest nav) and URL routing (`/realtime`,
  `/backtest`) — the app's first navigation, replacing the single centered test page.
- `RecentTicks`: a live trade tape (time, price, volume, buy/sell) fed by the same push
  channel the charts use, now carrying volume and side.
- `Annotations`: an empty placeholder panel — no strategy/signal data exists yet (T11+).
- `MarketPanel` (T07's original live-price card) is retired — its pieces (pair-select,
  live tick data) now live in `PairSelect` and `RecentTicks`; its single-timeframe candle
  table is redundant once the 4-chart dashboard exists.
- `/backtest` is a placeholder screen — its real content (the historical date-range gap
  found in the Module 1 analysis) is follow-up work, not this change.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `candle-history`: adds a requirement that a user can view several timeframes of one
  pair at once, each independently switchable. No existing requirement's behavior
  changes — this only adds to what the capability covers.
- `market-stream`: the live trade price a watcher receives now carries volume and
  buy/sell side, not just price and time.

## Impact

- `apps/web/src/market/`: `CandleChart.tsx` (chrome removed), new `TimeframeSelect.tsx`,
  `PairSelect.tsx`, `Dashboard.tsx`, `RecentTicks.tsx`, `Annotations.tsx`;
  `MarketPanel.tsx` deleted.
- `apps/web/src/layout/` (new): `Navbar.tsx`, `Header.tsx`.
- `apps/web/src/screens/` (new): `RealtimeScreen.tsx`, `BacktestScreen.tsx`.
- `apps/web/src/App.tsx`: becomes the router shell (`BrowserRouter` + `Navbar` + routes).
- `apps/web/src/index.css`: full-width app-shell layout replaces the centered test page.
- `apps/web/package.json`: adds `react-router-dom`.
- `apps/api/src/market/binance-stream.adapter.ts`,
  `apps/api/src/market/ports/exchange-stream.port.ts`,
  `packages/contracts/src/wire.ts`: `MarketPrice` gains `volume`/`side`.
- Task: **T08**, Trello card: https://trello.com/c/IVkxmnZG/8-t08-4-chart-dashboard.
