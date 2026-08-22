# Overall score formula and trade count damping for leaderboard

## Why this

Section 21 and Section 35 require the overall ranking score to be explicitly defined, mathematically sound, and capable of balancing profitability against risk and statistical reliability.

A naive ranking based purely on Total Return or Win Rate produces pathological outcomes: a candidate with 2 lucky trades achieving 100% win rate outranks a proven candidate with 80 trades and 65% win rate, or a strategy making 30% return while enduring a catastrophic 60% drawdown beats one making 25% with only 5% drawdown.

We define the composite Overall Score (formula version `v1`) as:

1. **Base Score**:
   \[
   \text{BaseScore} = 0.40 \times \text{totalReturn} + 0.20 \times \text{winRate} - 0.30 \times \text{maxDrawdown} + 0.10 \times \max\left(0, \frac{\text{sharpeRatio}}{3}\right)
   \]
   - Profitability (`totalReturn`, weight 0.40) rewards capital growth.
   - Consistency (`winRate`, weight 0.20, range [0, 1]) rewards hit rate.
   - Risk Penalty (`maxDrawdown`, weight 0.30, range [0, 1]) penalizes peak-to-trough capital loss.
   - Risk-Adjusted Quality (`sharpeRatio`, weight 0.10, normalized against standard benchmark scale of 3.0) rewards steady excess return per unit of volatility.

2. **Trade Count Confidence Damping**:
   To prevent small sample bias without discarding early candidates, a sub-linear square-root confidence damping multiplier is applied:
   \[
   \text{Confidence}(N) = \min\left(1.0, \sqrt{\frac{N}{N_{\text{threshold}}}}\right) \quad \text{where } N_{\text{threshold}} = 20
   \]
   \[
   \text{OverallScore} = \text{BaseScore} \times \text{Confidence}(N)
   \]

3. **Formula Versioning**:
   The formula is stamped with `SCORE_FORMULA_VERSION = 'v1'`. When scoring criteria evolve, bumping the version identifier preserves auditability (ADR 0011).

## What else we looked at

- **Raw Return or Sharpe sorting only** — simple to implement, but fails the Section 21 mandate. Pure Sharpe fails when returns are negative or trade counts are small, and pure return rewards reckless leverage.
- **Hard Trade Count Threshold (e.g. \(N < 10 \implies \text{disqualified}\))** — creates a discontinuous cliff where 9 trades score 0 and 10 trades score full. Smooth sub-linear damping allows early search discoveries to surface while favoring mature samples.
- **Linear Damping (\(N / 20\))** — penalizes moderate trade samples too aggressively (e.g. 10 trades would lose 50% score). Square-root damping \(\sqrt{10/20} \approx 0.71\) provides a balanced statistical confidence curve.

## Trade-offs

- The weights (0.40 return, 0.20 win rate, 0.30 drawdown, 0.10 Sharpe) reflect a balanced swing-trading preference. Different market regimes or risk tolerances may value drawdown avoidance higher; recomputing on read (ADR 0011) ensures adjustments require modifying only the calculator query rather than re-running the database.
- Sharpe ratio is assumed clamped to non-negative contributions in the base score so negative Sharpe does not compound with drawdown penalties twice.
