# Historical candles are queryable by an explicit date range

## Why this

`GET /market/candles` only ever answered "give me the most recent N," which was
everything T06's chart needed. Module 1's own example of historical data is a date
range (`01/07 → 30/07`), and a backtest reads a dataset's own window, not whatever
candle happens to be newest — T12 will ask this question again, and the Backtest tab
asks it first.

The endpoint stays a storage read. `0023` already decided backfill is bounded (1000
candles, lazy on first watch) specifically so T19's search loop never reads live from
Binance; a range query that fell back to fetching Binance for whatever the stored data
doesn't cover would quietly reopen exactly that door for anyone who asks for an old
enough window. So a range request answers from what is stored, in full, even when that
is less than what was asked for — partial or empty, never an error, and never a fetch.
Filling a specific gap on purpose (a "load more history" action) is a real feature, but
a different one, for whoever builds the screen that needs it.

## What else we looked at

**Backfill the missing part of the range on demand, then answer.** The obvious way to
make a request always "succeed" with the exact range asked for. Rejected because it's
the rate-limit problem `0023` exists to prevent, arriving through a side door — a range
query hitting an uncovered decade would fire the same unbounded burst of Binance calls
a naive T19 loop would have.

**Error on an uncovered range instead of returning partial data.** Simpler to reason
about from the caller's side — you always know whether you got what you asked for. Cost
more: a range that is 99% covered and 1% missing (the common case, since backfill only
reaches back so far) becomes unusable instead of mostly usable, and the caller has no
way to tell "nothing here" from "database down" without inspecting the body anyway.

## Trade-offs

A caller cannot tell, from this endpoint alone, whether a short result means the range
is genuinely thin or just not backfilled that far back — both look identical. Answering
that question needs a second signal (the earliest stored candle for the pair/timeframe,
say), which this change does not add, because nothing calling this endpoint today needs
it yet.

The endpoint now has two modes (`limit`-only, and `from`/`to`) instead of one, which is
one more shape for a caller to hold in mind — accepted because the two modes answer
genuinely different questions ("what just happened" versus "what happened between two
points"), not because the API accreted options over time.
