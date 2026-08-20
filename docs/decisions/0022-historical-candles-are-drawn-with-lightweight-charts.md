# Historical candles are drawn with lightweight-charts

## Why this

Candle data already arrives shaped for financial charting — `Candle` carries pair,
timeframe, open time and OHLC as decimal strings. T06's "done means" is explicit that
the screen shows a candlestick chart, not a generic line or bar chart, and
`apps/web/docs/UI_CONSTRAINT.md` fixes whatever gets picked here as the only chart
library for the whole app: T08's 4-chart dashboard, and any later equity-curve or
leaderboard chart, inherit it rather than choosing their own.

The frontend renders what the backend computed and derives nothing (Iron Rule 5,
`UI_CONSTRAINT.md`). A library that already knows how to draw a candle — body, wick,
up/down colour — keeps that boundary. Hand-building candle geometry on a generic
primitives library would mean writing chart logic in React, which is the anti-pattern
itself, not an implementation detail of avoiding it.

`lightweight-charts` (TradingView, MIT licence, ~45KB gzipped) ships a candlestick
series and line/area series from one package: T06 needs the former, and later screens
(T14's equity curve, T20's search results) can reuse the same per-panel pattern with the
latter, without a second dependency. It is canvas-based, so the 1000 candles per pair
`0023` backfills render and pan without the per-node DOM cost a library built from SVG
shapes per candle would carry, and that matters once T08 puts four of these on screen
at once.

## What else we looked at

**A generic charting library (Recharts, or primitives such as visx).** Flexible for the
line and bar charts T14/T20/T24 will eventually want, but none of them ship an OHLC
candlestick series out of the box — drawing wicks and bodies would mean writing that
geometry in React, exactly the anti-pattern above. It would also mean picking a second,
differently-shaped library later for anything that isn't a candle, which
`UI_CONSTRAINT.md`'s "only one chart library" rule forbids outright.

**Chart.js with a financial plugin (`chartjs-chart-financial`).** Closer fit, but the
candlestick type lives in a community plugin with a far smaller maintenance footprint
than the core library, and rendering is still DOM/SVG-per-point under the hood — costlier
at 1000+ candles across four simultaneous charts than a renderer built for exactly this.

**TradingView's full `charting_library`.** The most capable option, and the one every
trader recognises, but it isn't npm-installable — it's a separate licence agreement and a
self-hosted bundle, disproportionate to what T06 needs (one candlestick series plus a
live update) and it adds a licensing decision nobody asked for.

## Trade-offs

`lightweight-charts` is single-purpose: it draws price series well and nothing else. Any
indicator overlay T10 wants (a moving average line, a Bollinger band) has to be added as
an extra series on the same chart rather than configured through a plugin system — more
explicit, but more code per indicator than a library with built-in technical-analysis
overlays.

It has no built-in drawing tools or multi-pane layouts — volume in its own pane, RSI
below the price. T08's dashboard and any later indicator panel hand-roll that
arrangement out of multiple chart instances or panes rather than getting it from the
library.

Locking this in for the whole app means a future screen that genuinely wants something
`lightweight-charts` doesn't do well — a scatter plot of search results, say — still has
to fit inside it, or argue an explicit exception when that screen is built.
