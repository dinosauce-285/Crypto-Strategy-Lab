# Backfill is 1000 candles per pair and timeframe, fetched lazily on first watch

## Why this

T19's search loop backtests up to 10,000 candidates (section 43). If each backtest read
candles live from Binance, that is 10,000 API calls at minimum, straight into Binance's
rate limit — the reason this card exists. Storing the history once and reading it from
Postgres on every backtest removes the exchange from that loop entirely.

Iron Rule 7: a backtest may never read data later than the candle it is standing on, and
re-running one must produce an identical result. A fixed depth fetched once, extended
only by new candles arriving live through T07's `CandleClosed` event, makes that
guarantee mechanical — nothing about a stored row changes because a later request asks
for more history.

Fetching lazily, on first watch of a pair and timeframe, rather than pre-seeding a fixed
pair list, means storage tracks exactly what the app actually shows. `MarketPanel.tsx`'s
pair list (`BTCUSDT`, `ETHUSDT`, `SOLUSDT`) is a placeholder likely to change before T08
or T11's first strategy settles on a real one; a decision built around today's three
pairs would need revisiting the moment that list does.

1000 is also the practical ceiling: Binance's REST kline endpoint caps a single request
at 1000 rows, so it is the largest backfill obtainable without pagination, and pagination
for a first pass is complexity this task does not need yet.

## What else we looked at

**Backfill full available history.** Most complete, but unbounded — it would page
Binance repeatedly for pairs and timeframes nobody has looked at yet, spending API budget
and storage on data no screen or backtest asked for. It also does not address the thing
that actually needs bounding: T19's rate-limit problem is about the loop's read pattern,
not about how far back a chart can scroll.

**Fetch history on demand, per backtest, inside T19.** This is the exact pattern T06
exists to prevent — a live read per candidate is what hits the rate limit. Rejected for
that reason alone.

**Pre-seed a fixed pair/timeframe list now.** Simpler to reason about — a known set of
rows exists at deploy time — but it couples a storage decision to today's UI placeholder
list, and every pair or timeframe added later (T08's dashboard, T11's first strategy)
would need a second, different backfill path anyway. Lazy-on-watch is the one path that
already covers both cases without a second mechanism.

## Trade-offs

1000 candles may not be enough lookback for every future strategy — a moving average
with a long period on a fine timeframe (a 500-period average on `1m`, say) needs more
history than this backfill provides. Getting more means a second backfill call for that
pair/timeframe; because existing rows are never rewritten, older candles can be added
later without touching what already-run experiments read, but nothing in this task
builds the trigger for that second call.

Backfilling on first watch means the first client to watch a new pair/timeframe pays a
visible delay — one REST round trip — before the chart has anything to show, rather than
the data already being there. The `candle-history` spec covers this with an explicit
loading state, but it is a real latency, not a free lunch.

Because the depth is fixed rather than configurable per pair, a pair that trades far more
often than another gets the same 1000-candle window on a given timeframe — proportionally
less real time covered, not less data.
