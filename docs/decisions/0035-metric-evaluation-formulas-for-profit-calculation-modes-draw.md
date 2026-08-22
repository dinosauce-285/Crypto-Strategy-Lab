# Metric evaluation formulas for profit calculation modes, drawdown tracking, and statistical metrics

## Why this

Evaluation turns a list of simulated trades into quantitative performance metrics (`totalReturn`, `profitLoss`, `winRate`, `tradeCount`, `maxDrawdown`, and optional `profitFactor`, `sharpeRatio`) as required by brief section 20. ADR 0010 decided that `profitMode` and `drawdownMode` are dataset attributes. For T13's Evaluator, we define the mathematical formulations for all 7 metrics:

1. **Return & Profit/Loss**:
   - For a trade $i$, percentage return $r_i = \frac{\text{exitPrice} - \text{entryPrice}}{\text{entryPrice}} \cdot \text{sideFactor} - \text{totalFeeRate}$, where $\text{sideFactor} = +1$ for BUY and $-1$ for SELL.
   - Net profit in quote currency: $\text{netProfit}_i = \text{profit} = \text{exitPrice} \cdot \text{qty} - \text{entryPrice} \cdot \text{qty} - \text{fees}$.
   - **`profitLoss`**: Exact quote currency sum $\sum_{i=1}^N \text{netProfit}_i$, stored and formatted as a decimal string.
   - **`totalReturn`**:
     - `simple`: Linear sum of percentage returns $\sum_{i=1}^N r_i$.
     - `compound`: Compounded geometric growth $\prod_{i=1}^N (1 + r_i) - 1$.

2. **Win Rate & Trade Count**:
   - **`tradeCount`**: Total number of closed trades $N$.
   - **`winRate`**: Ratio of winning trades ($\text{netProfit}_i > 0$) to total trades $\frac{N_{\text{win}}}{N} \in [0, 1]$. Returns $0$ when $N = 0$.

3. **Max Drawdown**:
   - Cumulative equity series $E_k$ starts at $E_0 = 1.0$. Peak equity $P_k = \max(P_{k-1}, E_k)$.
   - Current drawdown at point $k$: $DD_k = \frac{P_k - E_k}{P_k} \in [0, 1]$.
   - **`trade-close`**: $E_k$ is updated only at the completion of each closed trade ($k = 1 \dots N$).
   - **`per-candle`**: $E_t$ is updated at every candle $t$ during an active trade's holding window using the candle's adverse price movement ($\text{low}$ for BUY, $\text{high}$ for SELL).
   - $\text{maxDrawdown} = \max_k(DD_k)$. Returns $0$ when $N = 0$.

4. **Profit Factor & Sharpe Ratio**:
   - **`profitFactor`**: $\frac{\sum_{\text{profit}_i > 0} \text{profit}_i}{\sum_{\text{profit}_i < 0} |\text{profit}_i|}$. Returns `null` when gross losses are $0$ to prevent `Infinity` serialization failures in JSON and Postgres.
   - **`sharpeRatio`**: $\frac{\bar{r} - r_f}{\sigma_r}$, where $\bar{r} = \frac{1}{N}\sum r_i$, $r_f = 0$ (risk-free rate assumption), and $\sigma_r$ is the sample standard deviation $\sqrt{\frac{1}{N-1}\sum (r_i - \bar{r})^2}$. Returns `null` when $N < 2$ or $\sigma_r = 0$.

## What else we looked at

**Hardcoding a single compounding return and trade-close drawdown in the evaluator** — rejected because backtesting spot strategies on different asset classes often compares simple arithmetic returns, and intra-trade drawdown during deep wick dips is critical for risk assessment. Dataset configuration (ADR 0010) enables both without changing evaluator code.

**Returning `Infinity` for profit factor on 100% win rate** — rejected because `Infinity` is not valid JSON and cannot be stored in SQL `Float` columns without errors or custom sentinel values. Returning `null` conforms with contract types where optional metrics are omitted when mathematically undefined.

**Computing profit/loss with floating-point numbers** — rejected because floating-point drift creates minor precision discrepancies across runs. Money remains decimal strings (ADR 0016) and is summed with exact decimal arithmetic.

## Trade-offs

- `per-candle` drawdown calculation requires passing historical candle bars to the evaluation service when that mode is enabled on the dataset, whereas `trade-close` operates purely on the `Trade[]` array.
- Returning `null` for `profitFactor` and `sharpeRatio` when undefined means UI leaderboard sorting (T18) must handle `null` values as lowest rank or unranked.
