## Why

`historical-candles-date-range` closed the backend gap and said explicitly: "no frontend
changes — this is the backend capability the Backtest tab will read from later, not the
screen itself." The Backtest tab is still the placeholder T08 left behind ("Historical
data — coming next"). This is that later work, scoped narrowly: one static chart reading
a fixed window through the range endpoint. A date-range picker and any strategy-result
overlay are separate, later work — this only proves the range query has a screen that
reads it.

## Decisions

**Settled** — [0026](../../../docs/decisions/0026-historical-candles-are-queryable-by-an-explicit-date-range.md)
the range endpoint this reads from; [0022](../../../docs/decisions/0022-historical-candles-are-drawn-with-lightweight-charts.md)
the chart library, unchanged. No new decision — this applies both, it doesn't add to
either.

**To settle** — none.

## What Changes

- The Backtest tab shows one candlestick chart for a selected pair/timeframe (`PairSelect`/
  `TimeframeSelect`, both reused from the Realtime tab), fetched once via
  `GET /market/candles?from=&to=` for a fixed default window per timeframe — no live
  updates, no date picker.
- Since a range request never backfills (ADR 0026), a pair/timeframe never watched on the
  Realtime tab has nothing stored yet: the chart shows the empty state, not a blank grid,
  and says so.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `candle-history`: adds a requirement that a user can view a static historical chart for
  a pair/timeframe on the Backtest tab, alongside the existing live-dashboard requirement
  T08 added.

## Impact

- `apps/web/src/market/BacktestChart.tsx` (new).
- `apps/web/src/screens/BacktestScreen.tsx` (placeholder replaced with the real screen).
- No backend, no `packages/contracts` change — reads the existing range endpoint as-is.
