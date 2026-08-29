# News sentiment strategy plugs into the strategy registry with causal aggregation

## Why this

Section 30 of the project brief states that news sentiment can become a trading strategy, giving the concrete example:
`Average sentiment over 1 hour > 0.7 -> BUY`, `Average sentiment < -0.7 -> SELL`. Section 17 introduces the `Information` group to accommodate strategies derived from non-price information sources, and Section 46 Steps 9–10 specify including `SentimentStrategy` in the search space to compose candidates like `MA + RSI + News Sentiment`.

To fulfill this while maintaining strict architectural boundaries (AGENTS.md, ADR 0008, ADR 0012):
1. `SentimentStrategy` implements the standard `Strategy` interface and declares its data requirements via `requires(params)` as `{ source: 'sentiment', params: { windowHours } }`.
2. The strategy contains trading logic only: it evaluates signals from precomputed sentiment scores provided via `StrategyContext.get()` and never reaches into the database or third-party APIs directly.
3. Causal sentiment aggregation is computed by `SentimentCalculator` (`name: 'sentiment'`), strictly enforcing that for any candle at `openTime`, only news articles with `publishedAt <= openTime` and within the lookback window `[openTime - windowMs, openTime]` are aggregated. This eliminates lookahead bias in backtests (ADR 0034).

## What else we looked at

**Letting the strategy query the News table directly** — this would violate the core architectural invariant forbidding strategies from accessing the database (Section 44 anti-pattern). It would also break reproducibility across candidate runs and prevent caching.

**Hardcoding sentiment signals outside the strategy registry** — handling news sentiment as a separate heuristic layer outside `StrategyRegistry` and `DomainGuidedCandidateGenerator`. This was rejected because the brief specifically requires sentiment to be a standard composable strategy in the search space (Section 30, Section 46).

## Trade-offs

The rolling sentiment series must be prepared per dataset and candle timeline, adding a calculator pass in `IndicatorService`. However, because sentiment calculations are pure and cached, the overhead across candidate iterations is minimal.
