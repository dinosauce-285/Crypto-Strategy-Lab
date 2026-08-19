# The leaderboard is computed from experiments on every read

## Why this

Section 35 asks this one directly and asks for the reasoning, so the reasoning is the
deliverable more than the choice is.

The argument is section 21. It requires the overall score formula to be spelled out,
and a formula that has to be written down and defended is a formula that will be
adjusted several times before hand-in — weights moved, drawdown penalised harder, a
minimum trade count added. Under a stored score and rank, each adjustment means
re-scoring every experiment in the store before the board is honest again. Under
recomputation, it means changing one query and reloading the page.

The load is small. A leaderboard is a top-K over the experiments of one dataset,
which is an `ORDER BY` with a `LIMIT` over a few thousand rows — the kind of query
Postgres answers without being asked twice. Nothing about the shape of this project
suggests that changes: experiments accumulate in the thousands, not the millions.

No cache for now. The recommendation this page inherited was "recompute, add a cache
when it feels slow", and the second half is the part being deferred deliberately: a
cache adds a copy that can be stale, and a stale leaderboard is a bug nobody sees,
because a wrong ranking still looks like a ranking. Adding one is a decision to make
against a measurement, and it gets its own record when it happens.

This also keeps `0003` honest. The backtest worker publishes `experiment.completed`,
the ranking service listens and tells the UI the board has changed; the UI re-reads.
Nothing stores a rank, so nothing can hold a rank that disagrees with the experiments
it came from.

## What else we looked at

**Store the score and the rank** — the fastest read, and the obvious answer if the
formula were fixed. Two costs sank it. Every formula change re-runs a scoring pass
over the whole store, and during that pass the board is wrong. And a stored rank is a
second source of truth: it can disagree with the experiments it was derived from, and
when it does there is nothing to tell you.

**Recompute plus a cache from day one** — the compromise, and defensible. We start one
step earlier because a cache introduced before there is a slow query is a moving part
added to solve nothing, and the specific failure it can produce — a stale copy read as
current — is the hardest kind to notice on a page of numbers.

## Trade-offs

Every read scans the experiments of a dataset. We are asserting that this is
negligible at a few thousand rows rather than proving it, and the assertion has not
been measured on real data yet. If a search runs far longer than planned, this is the
decision that gets revisited first.

Because the score is computed rather than stored, changing the formula silently
reorders every past result. That is correct — all rows are then scored the same way —
but it means a leaderboard screenshot from last week cannot be reproduced today. If
that matters at hand-in time, the formula needs a version of its own, the way `0009`
gave one to strategy code. It does not have one now.

The board is only as coherent as its dataset filter: it must always be read for one
dataset, never across several, or it compares runs judged by different rules — which
is what `0010` exists to make visible.
