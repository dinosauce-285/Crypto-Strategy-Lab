## Why

The laboratory requires the capability to evaluate trading strategies over historical market data in an isolated, reproducible, and causally pure manner. T12 introduces the Backtesting Engine to simulate trade execution for any candidate strategy over a dataset, producing deterministic trade logs without looking ahead or leaking future candle data.

Evidence in the brief:
- Section 19: "if I had used this strategy in the past, what would the result have been?"
- Section 36: Re-running a backtest over the same dataset must produce an identical result.
- Section 37: "Simulate trades over historical data".

Task: `T12` · Slice 2: Run one strategy (Trello: `T12-backtesting-engine`).

## Decisions

**Settled** — [0006](../../../docs/decisions/0006-signal-carries-strength.md) (signals carry direction and strength), [0007](../../../docs/decisions/0007-candidate-as-spec.md) (candidate strategy travels as `CandidateSpec` data and is instantiated via the registry), [0008](../../../docs/decisions/0008-strategy-declares-its-data.md) (strategy declares data requirements and engine prepares the required series), [0010](../../../docs/decisions/0010-dataset-carries-the-backtest-rules.md) (backtest rules live inside the `Dataset` entity, not in global config).

**To settle** — The concrete backtest execution rules (entry price timing on signal, trading fee percentage calculation, and warmup candle resolution between strategy metadata and dataset bounds), to be recorded in `0033-backtest-execution-rules.md`.

## What Changes

- Introduce `BacktestEngineService` in `apps/api` to execute backtest runs over loaded datasets.
- Implement strictly causal iteration: feed historical candles sequentially up to candle $t$ without allowing access to candle $t+1$.
- Instantiate runnable strategy objects from `CandidateSpec` using the strategy registry (ADR 0007).
- Execute simulated trades according to dataset rules (entry price, fees, position sizing, warmup).
- Return deterministic `Trade[]` list with exact entry/exit timestamps, prices, fees, and profit/loss.

## Capabilities

### New Capabilities
- `backtesting-engine`: Executes a candidate strategy over a historical dataset, enforcing causal purity, dataset execution rules, and returning simulated trade logs.

### Modified Capabilities
<!-- None -->

## Impact

- `apps/api`: New backtest engine module/service under `src/backtest/` or `src/strategy/backtest/`.
- `packages/contracts`: Backtest request/response contracts and trade record types.
- No direct database writes or exchange calls from within the backtesting engine (Iron Rules 2 & 4).
