# Indicator series are named by dotted source, one field per DataRequest

## Why this

`DataRequest.source` (`packages/contracts/src/strategy.ts`, locked by `0008`) is one
string, and `StrategyContext.get` returns one `number[]`. MA and RSI fit that directly.
Bollinger Bands do not — section 9 draws three lines from one indicator — and neither
does Support/Resistance, which this codebase treats as two independent series (support
and resistance move independently; a candle can sit near one, both, or neither).

The convention is `<indicator-name>.<field>`, kebab-case name, field omitted for a
single-series indicator: `ma`, `rsi`, `bollinger.upper`, `bollinger.middle`,
`bollinger.lower`, `support-resistance.support`, `support-resistance.resistance`. This
mirrors the dotted namespacing `packages/contracts/src/events.ts` already uses for event
names (`market.candle.closed`), so a reader who knows that convention already knows this
one.

The split is more than naming. Bollinger's three bands share one SMA-and-stddev pass;
computing `upper`, `middle` and `lower` as three unrelated indicators would triple that
work for every candidate that asks for any of them. `IndicatorService` splits `source` on
the first `.` to get `[name, field]`, and every calculator returns a `Record<string,
number[]>` even when it only has one field — so the cache key is `(datasetId, name,
params)`, not `(datasetId, source, params)`, and three `DataRequest`s for the same
indicator and params share one computed pass and one cache entry.

## What else we looked at

**A struct-returning source, one request per indicator** — `bollinger` returns
`{upper, middle, lower}` and a strategy destructures it. Closest to "compute Bollinger
once," but it breaks the contract `get(request: DataRequest): readonly number[]` locked
in `0008`'s neighbourhood — every caller would need a second, incompatible return shape
for exactly the indicators this decision is about, and `StrategyContext` would need two
methods instead of one.

**Three fully separate indicators** (`bollinger-upper`, `bollinger-mid`,
`bollinger-lower`, each its own calculator) — no dispatch logic, no split. It throws away
the shared computation this decision is written to keep, and the three names carry no
relationship to each other in the registry the way `bollinger.*` visibly does.

**camelCase or a different separator** (`bollingerUpper`, `bollinger:upper`) — no
functional difference, just inconsistent with the one dotted convention this codebase
already has for names of this shape.

## Trade-offs

`IndicatorService` now has two things to keep straight instead of one: dispatch on the
full `source` and caching on `name` alone. A calculator that forgets to fill in every
field of its return object fails at the point a strategy reads a field that isn't there,
not when the calculator runs — the same class of run-time-only failure `0008` already
accepts for a strategy's own declared needs.

The convention only works because indicator names never contain a literal `.`. Nothing
enforces that beyond review — the same trust `AGENTS.md` already places in kebab-case
file names.
