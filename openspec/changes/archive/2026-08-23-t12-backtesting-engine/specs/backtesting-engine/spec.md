## Purpose

Simulates trading execution for candidate strategies over historical datasets, strictly enforcing causality, dataset-configured rules, and reproducible trade outputs.

## ADDED Requirements

### Requirement: Causal strategy backtesting over dataset
The backtesting engine SHALL iterate sequentially over the historical dataset and provide only past and current candle data up to the standing step $t$, strictly preventing access to future candles ($t+1$).

#### Scenario: Sequential iteration without future peeking
- **WHEN** a backtest run is executed over a dataset with $N$ candles
- **THEN** at step $i$, the strategy instance only receives candle and indicator data from index $0$ to $i$, and cannot access indices $> i$

### Requirement: Candidate instantiation via Strategy Registry
The backtesting engine SHALL construct runnable strategy instances from a declarative `CandidateSpec` definition using the strategy registry (ADR 0007), without hardcoded combination branching.

#### Scenario: Strategy instantiated from CandidateSpec with parameters
- **WHEN** a backtest request provides a `CandidateSpec` with a valid strategy name and parameter map
- **THEN** the engine resolves the strategy from the registry, instantiates it with the specified parameters, and executes the run

### Requirement: Dataset execution rules enforcement
The backtesting engine SHALL read and apply execution rules (entry price timing, trading fee rates, and warmup candles) defined in the provided `Dataset` entity (ADR 0010).

#### Scenario: Entry price execution on signal
- **WHEN** a strategy emits a Buy or Sell signal at candle $t$
- **THEN** the trade entry is executed according to the dataset's entry price rule (open of next candle $t+1$ or close of signal candle $t$)

#### Scenario: Fee deduction on simulated trades
- **WHEN** a trade is opened or closed and the dataset specifies a fee percentage
- **THEN** the fee is calculated and deducted from the trade's realized profit and loss

#### Scenario: Warmup period skips trade generation
- **WHEN** the engine is iterating through the initial warmup period (determined by dataset and strategy metadata)
- **THEN** signals emitted during warmup are ignored and do not generate executed trades

### Requirement: Deterministic trade output and result reproducibility
The backtesting engine SHALL produce an identical, deterministic list of simulated trades when executing the same `CandidateSpec` over the same `Dataset` (brief section 36).

#### Scenario: Re-running produces identical trade list
- **WHEN** a backtest is executed multiple times with identical `CandidateSpec` and dataset inputs
- **THEN** every run returns the exact same list of trades with matching timestamps, prices, fees, and quantities
