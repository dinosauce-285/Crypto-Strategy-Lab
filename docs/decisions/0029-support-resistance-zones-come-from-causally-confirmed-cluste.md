# Support/Resistance zones come from causally-confirmed, clustered pivots

## Why this

Section 10 says explicitly that zone detection "depends on the algorithm" — the brief
gives no formula, unlike MA, RSI and Bollinger, which are standard textbook math. This
codebase needs one real answer, and it has to hold under `0008`'s constraint that a
backtest never reads a candle later than the one it is standing on.

The algorithm: a candle `i` is a pivot low if its `low` is the minimum over the symmetric
window `[i-lookback, i+lookback]` (pivot high, analogously, on `high`); `lookback` is a
parameter, default 5. A pivot at `i` cannot be identified until its `lookback` right-hand
neighbours exist, so it only becomes usable starting at index `i+lookback` — never at `i`
itself. That confirmation delay is what keeps a fractal method, which inherently looks
both directions, honest about candle N only ever using data up to candle N. Confirmed
pivot-low levels within `mergeThresholdPct` of each other (relative, default 0.5%) merge
into one zone, valued at the mean of its members; pivot highs cluster the same way,
independently, into resistance zones. At each index, `support[N]` is the nearest
support-zone level at or below `close[N]` among zones confirmed by `N` (`NaN` if none
exist yet); `resistance[N]` is the nearest at or above, same rule.

This gives the two number-series `DataRequest`s decided in `0028`
(`support-resistance.support` / `.resistance`) a concrete, deterministic, re-runnable
source — the same candles always produce the same zones, which `0008`'s reproducibility
requirement needs regardless of which detection method was picked.

## What else we looked at

**A rolling min/max over N candles** — the simplest possible reading of "support and
resistance," no pivot logic, no clustering. Rejected because it is not really zone
detection: the level is always the most recent extreme rather than a price the market
has actually revisited, so a strategy built on it would be reacting to noise inside the
window rather than to structure. Section 10's own picture — a level the price bounced off
more than once — cannot be expressed this way.

**Volume profile / price-bucket histogram** (bucket closing prices, take the densest
buckets as zones) — a real alternative that trades candle geometry for traded volume as
the signal. Rejected for now because `Candle.volume` alone does not distinguish price
levels within a candle the way high/low does, and it needs a second tunable (bucket
width) doing the same job `mergeThresholdPct` already does here, for no clear gain at
this project's scope.

**No confirmation delay — treat a pivot as known at its own index** — simpler, one fewer
concept to explain. This is exactly the lookahead bias `0008`'s constraint exists to rule
out: a pivot low is only a pivot because candles that had not happened yet turned back up
from it, so using it at its own index means the strategy already knows the future shape
of the chart at the moment it is supposedly deciding.

## Trade-offs

Nearest-zone lookup is a linear scan over confirmed zones at every index —
`O(candles × zones)`, not the asymptotically better structure a sorted-level index would
give. Accepted because `AGENTS.md` grades the architecture, not the returns, and nothing
today shows indicator prep as a bottleneck; `0011` already frames recomputation cost as
the thing worth watching, so this is revisited if profiling ever says otherwise, not
before.

`lookback` and `mergeThresholdPct` are guessed defaults with no argument behind them, the
same class of unargued number `0015` accepted for the composite's threshold and decay —
except neither is wired up as a searchable dimension here, because Support/Resistance is
an indicator, not a strategy, and nothing in `0015`'s reasoning currently reaches this
layer.

A zone is only ever built from pivots, so a level the market has touched without forming
a clean local extreme — a flat consolidation, a wick that overshoots and returns inside
one candle — is invisible to this method. That is a real limitation of fractal detection,
not an oversight; it is the trade-off for a method simple enough to explain and to prove
causal.
