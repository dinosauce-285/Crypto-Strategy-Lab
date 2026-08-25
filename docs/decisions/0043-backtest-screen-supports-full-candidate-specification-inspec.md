# Backtest screen supports full candidate specification inspection and auto execution

## Why this

Section 46 step 6 requires that clicking a ranked strategy on the Leaderboard opens
the visual chart displaying buy and sell markers, moving averages, support/resistance
levels, and trade performance metrics. In the system, strategies discovered by search
are composite candidate specifications (`CandidateSpec`) combining multiple members
with weights and specific parameters.

Navigating to the Backtest screen with the full `CandidateSpec` and automatically
triggering backtest execution preserves the full fidelity of the candidate recipe.
The server executes the composite strategy and returns the trade history, metrics,
and indicator overlays (MA, Bollinger Bands, Support/Resistance). The user is
presented immediately with the interactive candlestick chart, trade logs, and metrics
panel without needing to re-select parameters or manually press run.

## What else we looked at

**An inline inspection modal or panel directly on the Leaderboard screen** — this would
avoid page navigation, but duplicates the candlestick chart, indicator overlay logic,
and trade logs table across two separate screens, bloating frontend bundle size and
maintenance burden.

**Truncating the composite recipe to its first member (`members[0]`)** — this treats
every candidate as a single strategy. While simple, it completely breaks composite
recipes produced by search (e.g. `MA + RSI + Bollinger + SR`), rendering inaccurate
trades and indicators that do not reflect the ranked strategy's true performance.

**Navigating with pre-filled inputs without auto-running** — requiring the user to
manually click "Run Backtest" after clicking a leaderboard item leaves the screen in an
unpopulated idle state, violating the quick inspection workflow of §46 step 6.

## Trade-offs

The Backtest screen's strategy configuration panel must support dual modes: editing
single strategy parameters dynamically via dropdown, and displaying read-only composite
recipe cards with member weights and parameters when inspecting composite candidates.
An explicit "Switch to Standalone" action is provided if the user wishes to transition
back to standalone strategy configuration.
