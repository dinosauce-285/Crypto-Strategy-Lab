## Why

Slice 2 closes with an interactive single-run workstation where users can select a dataset (or configure a new one with its 5 execution rules), pick any registered strategy, configure its dynamically generated parameters, execute a backtest, and visually analyze trade executions on a candlestick chart alongside indicators, key performance metrics, and an interactive trade table (brief sections 25, 26, 33, 37, 46).

The parameter form is generated dynamically from strategy metadata (`meta.params`, ADR 0012) rather than hardcoded, ensuring that adding a new strategy requires zero UI code modifications. Clicking any trade in the table highlights that trade's entry and exit markers on the chart (brief section 26).

T14 · [Single-run screen](https://trello.com/c/Thien-t14-single-run-screen).
Brief: section 25 ("must let the user understand what the strategy did"); section 26 ("clicking Trade #3 can highlight it on the chart"); section 37 Visualization; section 46 steps 6-7; section 33 (picking BTCUSDT 5m, 01/01 -> 01/07).

## Decisions

**Settled**

- [0010](../../../docs/decisions/0010-dataset-carries-the-backtest-rules.md) — dataset is a record with its own ID carrying the 5 backtest rules (`entryPrice`, `feeRate`, `warmupCandles`, `profitMode`, `drawdownMode`); changing a rule creates a new dataset rather than editing one.
- [0011](../../../docs/decisions/0011-leaderboard-is-recomputed.md) — raw metrics only, worker/API computes, frontend renders. Buy/Sell markers come from stored Trades rows.
- [0012](../../../docs/decisions/0012-strategy-metadata.md) — parameter forms are dynamically generated from `meta.params`, never hardcoded.
- [0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md) — cross-module decoupling via ports.
- [0022](../../../docs/decisions/0022-historical-candles-are-drawn-with-lightweight-charts.md) — lightweight-charts for candlestick charts.
- [0025](../../../docs/decisions/0025-tab-navigation-uses-react-router.md) — URL-routed Realtime/Backtest navigation.
- [0028](../../../docs/decisions/0028-indicator-series-are-named-by-dotted-source-one-field-per-da.md) — indicator overlays from IndicatorPort.
- [0034](../../../docs/decisions/0034-backtest-execution-rules-for-entry-price-trading-fees-and-wa.md) — execution rules.
- [0035](../../../docs/decisions/0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md) — evaluation metrics calculation.

**To settle**

- Nothing to settle — builds directly on settled ADRs 0010, 0011, 0012, 0022, 0028, 0034, 0035 without modifying database schemas, shared type contracts, or core protocols.

## What Changes

- Backend (`apps/api`):
  - Add `StrategyController` in `apps/api/src/strategy/strategy.controller.ts` providing `GET /api/strategies` to expose registered strategy metadata (`StrategyMeta[]`).
  - Add Dataset listing and creation endpoints (`GET /api/datasets`, `POST /api/datasets`) in `apps/api/src/search/` (or `apps/api/src/market/`).
  - Add single-run backtest endpoint `POST /api/backtest/run` which instantiates the strategy, executes the backtest causal loop, evaluates and records experiment & trades via `EvaluatorPort` (T13), computes indicator overlays via `IndicatorPort` (T10), and returns the complete result payload (`{ experimentId, dataset, spec, metrics, trades, candles, indicators }`).
- Frontend (`apps/web`):
  - Transform `BacktestScreen.tsx` into a comprehensive single-run analysis screen.
  - `DatasetPicker` & `DatasetForm`: UI for choosing existing datasets or defining a new dataset with pair, timeframe, date range, and the 5 execution rules (`entryPrice`, `feeRate`, `warmupCandles`, `profitMode`, `drawdownMode`).
  - `StrategyPicker` & `DynamicParamForm`: Dynamic parameter controls generated from `meta.params` with proper range, step, and default values.
  - `SingleRunChart`: Interactive candlestick chart displaying candles, indicator series lines (MA, Bollinger Bands, RSI, Support/Resistance), and trade execution markers (BUY / SELL, ENTRY / EXIT).
  - `TradeHighlighting`: Clicking any row in the trade table highlights and focuses the corresponding entry and exit points on the chart.
  - `MetricsPanel`: Clean stat cards rendering Total Return, Win Rate, Max Drawdown, Trade Count, Profit/Loss, Profit Factor, and Sharpe Ratio.
  - `TradesTable`: Paginated/scrollable list of executed trades with sequential numbering (`seq`), execution times, prices, and net profit.
  - Comprehensive 4-state UI handling (loading, empty, error, ready) strictly complying with `UI_CONSTRAINT.md`.

## Capabilities

### New Capabilities
- `single-run-screen`: interactive single-run strategy backtest execution and visualization UI with dynamic parameter forms, dataset rule configuration, chart indicator & trade marker overlays, and trade-by-trade click highlighting.

### Modified Capabilities
(none)

## Impact

- `apps/api/src/strategy/`: `strategy.controller.ts`, `strategy.module.ts`.
- `apps/api/src/search/`: `search.controller.ts` / `backtest.controller.ts`, `dto/`.
- `apps/web/src/screens/BacktestScreen.tsx`, `apps/web/src/backtest/`, `apps/web/src/market/`.
- `openspec/specs/single-run-screen/spec.md`: new capability specification.
