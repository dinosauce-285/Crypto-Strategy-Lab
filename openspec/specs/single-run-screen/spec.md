# single-run-screen Specification

## Purpose
Provides an interactive single-run strategy backtesting interface enabling dataset rule selection, dynamic strategy parameter configuration, chart visualization with indicators and trade markers, and trade-by-trade click highlighting.

## Requirements

### Requirement: Dataset selection and backtest rule configuration
The system SHALL allow users to select an existing dataset or define a new dataset specifying trading pair, timeframe, date range (`from` / `to`), and all five execution rules (`entryPrice`, `feeRate`, `warmupCandles`, `profitMode`, `drawdownMode`).

#### Scenario: Selecting an existing dataset
- **WHEN** user chooses an existing dataset from the dataset selector
- **THEN** the system loads and displays the dataset's pair, timeframe, date window, and execution rules

#### Scenario: Defining a new dataset with custom rules
- **WHEN** user defines a new dataset specifying pair, timeframe, date range, and the 5 backtest rules
- **THEN** the system creates a new dataset record with a unique ID and makes it the active dataset

### Requirement: Dynamic parameter form generation from strategy metadata
The system SHALL fetch registered strategy metadata and dynamically generate parameter input controls matching each parameter's declared type, default value, step, and min/max boundaries without hardcoded form components.

#### Scenario: Strategy selection loads metadata
- **WHEN** user selects a strategy from the strategy list
- **THEN** the system renders form inputs corresponding to `meta.params` with their default values

#### Scenario: Parameter adjustment updates candidate specification
- **WHEN** user adjusts a numerical or select parameter control
- **THEN** the candidate parameter map is updated for the upcoming backtest run

### Requirement: Single-run backtest execution and metric display
The system SHALL execute the backtest causal loop for the candidate on the active dataset and display the resulting 7 metrics (`totalReturn`, `profitLoss`, `winRate`, `tradeCount`, `maxDrawdown`, `profitFactor`, `sharpeRatio`).

#### Scenario: Successful backtest run
- **WHEN** user clicks the "Run Backtest" button
- **THEN** the system executes the backtest, records the experiment and trades in the database, and renders the performance metric cards

#### Scenario: Failed run handling
- **WHEN** a backtest fails due to data or execution errors
- **THEN** the system displays a clear error state with retry guidance

### Requirement: Chart visualization with indicators and trade markers
The system SHALL render historical candlesticks with indicator series lines and trade execution markers (Buy/Sell, Entry/Exit) on the chart.

#### Scenario: Visualizing indicators and trade markers
- **WHEN** backtest execution completes with trades
- **THEN** the chart draws candlestick bars, computed indicator overlays, and markers at trade entry and exit timestamps

### Requirement: Interactive trade table and chart highlighting
The system SHALL render a table of executed trades with sequential numbering (`seq`), and clicking any trade row SHALL highlight its entry and exit points on the chart.

#### Scenario: Clicking a trade highlights chart markers
- **WHEN** user clicks on a trade row in the trades table
- **THEN** the chart highlights and focuses on the exact entry and exit points of that trade
