# Backtest execution rules for entry price, trading fees, and warmup periods

## Why this

Backtest simulation must accurately reflect real trading conditions while maintaining absolute reproducibility and causality (Iron Rule 7, brief sections 19 & 36). ADR 0010 decided that backtest execution rules reside inside the `Dataset` record rather than in global engine constants. For T12's Backtest Engine, we establish the concrete execution mechanics for the three core rules:

1. **Entry price timing**:
   - `next-open` (default): A signal emitted at candle $t$ enters at the open price of candle $t+1$. This is the standard, realistic assumption because a signal computed on candle $t$'s close cannot be executed until candle $t$ has finalized and candle $t+1$ begins.
   - `signal-close`: A signal enters at the close price of candle $t$. Supported for theoretical zero-latency models.
2. **Trading fees**:
   - Fees are deducted per-side (entry and exit) based on `dataset.rules.feeRate` (e.g. `"0.001"` for Binance's standard 0.1% spot fee).
   - Net profit for a trade accounts for both entry and exit fee deductions: $\text{profit} = \text{grossProfit} - (\text{entryFee} + \text{exitFee})$.
3. **Warmup resolution**:
   - Effective warmup candles $\text{warmup} = \max(\text{dataset.rules.warmupCandles}, \text{strategy.meta.warmup})$.
   - The engine ensures that historical candle indices prior to $\text{warmup}$ are fed to indicator calculators to stabilize series (e.g. 14-period RSI, 200-period SMA), but no trade entries are generated before index $\text{warmup}$.

## What else we looked at

**Fixed engine constants** — hardcoding `next-open`, 0.1% fee, and 50 warmup candles in the backtester code. This was rejected because different exchanges and asset classes carry different fee structures (e.g. VIP tiers, maker vs taker), and different timeframes require different warmup lengths. Putting rules in the dataset (ADR 0010) prevents silent invalidation of historical experiment leaderboards.

**Instantaneous execution on intra-candle ticks** — simulating sub-candle tick movements during backtesting. This was rejected because the dataset granularity is candle-based (OHLCV). Simulating intra-candle execution without full order book L2/L3 data introduces synthetic look-ahead assumptions and nondeterminism across runs.

## Trade-offs

- `next-open` execution requires that the dataset contains at least one candle after the signal candle to execute the trade entry.
- Max-combining dataset and strategy warmup values means datasets with smaller declared warmup than a complex multi-indicator strategy will automatically defer trading until the highest required indicator warmup is reached.
