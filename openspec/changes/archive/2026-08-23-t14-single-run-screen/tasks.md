## 0. Decisions

- [x] 0.1 No record — no contract, schema, module wiring, dependency or scoring rule moves; builds on settled ADRs 0010, 0011, 0012, 0022, 0028, 0034, 0035

## 1. Backend Endpoints (Strategy & Backtest Execution)

- [x] 1.1 Add `StrategyController` in `apps/api/src/strategy/` providing `GET /api/strategies` to return registered `StrategyMeta[]`
- [x] 1.2 Add dataset endpoints in `apps/api` (`GET /api/datasets`, `POST /api/datasets`) to list and create datasets with their 5 backtest rules
- [x] 1.3 Add single-run backtest endpoint `POST /api/backtest/run` that executes the strategy backtest, records experiment/trades via `EvaluatorPort`, computes indicators via `IndicatorPort`, and returns the complete result payload
- [x] 1.4 Add unit tests for strategy controller and backtest execution endpoint

## 2. Frontend Dataset & Dynamic Strategy Parameter Controls

- [x] 2.1 Implement `DatasetPicker` and `DatasetForm` supporting dataset selection and creation with all 5 rules (`entryPrice`, `feeRate`, `warmupCandles`, `profitMode`, `drawdownMode`)
- [x] 2.2 Implement `StrategyPicker` and `DynamicParamForm` dynamically rendering form controls from `meta.params` without hardcoded component logic

## 3. Frontend Visualization, Metrics & Interactive Trade Table

- [x] 3.1 Upgrade `SingleRunChart` with candlestick rendering, indicator series overlays (MA, Bollinger, RSI, Support/Resistance), and trade execution markers (BUY / SELL, ENTRY / EXIT)
- [x] 3.2 Implement `MetricsPanel` displaying 7 performance metrics (Return, Win Rate, Max Drawdown, Trade Count, Profit/Loss, Profit Factor, Sharpe Ratio)
- [x] 3.3 Implement `TradesTable` with sequential 1-based indexing and row click-to-highlight interaction that centers and highlights entry/exit points on the chart
- [x] 3.4 Wire all components into `BacktestScreen.tsx` handling all 4 UI states (loading, empty, error, ready) according to `UI_CONSTRAINT.md`

## 4. Verification & Quality Gates

- [x] 4.1 Verify UI token compliance with `pnpm --dir apps/web lint:ui`
- [x] 4.2 Verify frontend and backend quality gates (`pnpm lint`, `pnpm --dir apps/api exec tsc --noEmit`, `pnpm --dir apps/web build`, and `pnpm build`)
