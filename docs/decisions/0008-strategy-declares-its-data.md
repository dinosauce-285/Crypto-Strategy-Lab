# A strategy declares the data it needs, and the engine prepares it

## Why this

A strategy answers one question per candle, and to answer it needs numbers it does
not hold: a moving average over the last twenty candles, an RSI, the sentiment score
stored beside today's articles. The question is who produces those numbers and how
they reach the strategy.

Two answers are ruled out before the real choice starts. A strategy cannot compute
them itself, because the same average would then be recomputed by every candidate in
a search of ten thousand, and because a sentiment score is not computable from
candles at all. And it cannot read the database, which section 44 lists among the
design faults being marked.

What we chose is that a strategy states its needs up front. It answers
`requires(params)` with a list — this indicator with these numbers, this source over
this window — and the engine reads every member's answer before the run starts,
prepares exactly that much once for the dataset, and hands it over. `analyze()` then
reads what was prepared; it never triggers work.

The engine knowing ahead is the whole of the difference, and it buys three things.
A name that does not exist fails when the strategy is registered rather than in the
middle of a backtest. A source that has to be fetched rather than derived from
candles — stored sentiment scores, section 30 — is fetched for the whole range in one
query instead of once per candle. And the preparation for a candidate is a known set
of work before the loop opens, which is the honest version of the parallelism section
43 asks about.

It also costs less than it looks, because two neighbouring decisions already put the
mechanism there. D10 has each strategy declare its id, group and parameters so the
parameter form and the search space can be generated rather than hard-coded; a list
of data needs is one more field on that declaration. And `0006` already has a
strategy declare its own warm-up length. Declaring what you need about yourself is
the pattern this codebase is already using; querying for it at the point of use would
have been a second pattern for the same job.

The declaration is a function of the parameters, not a fixed list. The search engine
varies the numbers — RSI 14 this candidate, RSI 21 the next — so a static list would
be wrong on the second draw. A composite's needs are the union of its members'.

## What else we looked at

**A gateway you query** — `ctx.indicator('rsi', {period: 14})` at the point of use,
computed on first ask and kept. This is the option this decision is closest to
losing to, and the page that framed the question suggested it. It has no duplication:
the need is stated once, exactly where it is used. With a cache keyed by dataset,
indicator and parameters it also computes each indicator exactly once, so most of the
performance argument for declaring is really an argument for caching. What it cannot
do is tell the engine anything before the run: a mistyped name surfaces at the first
candle rather than at registration, a fetched source is pulled lazily unless the
gateway is carefully written to widen each first request to the whole range, and
nothing can be prepared in advance because nothing is known in advance. We took the
duplication to get that.

**A fixed struct holding every field** — the tray. Simplest to read, and wrong in the
specific way section 41 is written to expose. Adding a source changes the struct, and
with it every place that builds one: the worker, the chart endpoint, and every
strategy's test. A test for an MA strategy would need news data on hand to construct
a context. It also computes every indicator for every strategy when each uses two.

**Nest's dependency injection as the mechanism** — worth naming because a companion
document claims it. It does not fit. DI resolves dependencies by type at startup,
while a need here is `rsi` with the period the generator happened to pick this round.
Reading the declaration, preparing the data and handing it over is written by hand.
Nest still earns its place either way: the registry is a provider, and one shared
indicator service is injected into both the worker and the chart endpoint.

## Trade-offs

The need is written twice — once in `requires()`, once where it is used — and the two
have to be kept in step by hand. This is a real DRY violation and it is the price of
the decision, not an oversight. Declaring more than is used wastes preparation;
declaring less breaks at the point of use. The engine runs strict — asking for
anything that was not declared throws — so drift is caught rather than silently
served, but it is caught at run time, which is exactly the guarantee declaring was
supposed to buy.

There is a preparation step that can now fail before any strategy has been asked
anything, in a place that did not previously exist.

A strategy cannot discover a need partway through a run. Nothing in the brief's list
of strategies works that way, but if one ever does, it needs a narrow query gateway
opened beside the declaration rather than a change to it.

Whoever writes the first two strategies also writes the declaration mechanism, so T11
carries work that a gateway would not have required, while T12, T16 and T25 wait on
the `analyze()` signature it settles.
