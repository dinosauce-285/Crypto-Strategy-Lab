# Domain-guided search uses group composition and a top-result history

## Why this

T17 needs two search algorithms that can be swapped without the worker, queue,
backtester or evaluator changing. Both therefore sit behind `CandidateSource` and emit
the same `CandidateSpec`; the run selects a mode, and everything after the generator
sees only candidates.

The domain-guided rule is one Trend strategy, one Momentum strategy, and one context
strategy from Structure, Volatility or Information. Trend gives direction, Momentum
checks exhaustion, and the context slot asks whether price structure, volatility or
news confirms the setup. This uses the `group` field chosen in `0012`, so adding the
sentiment strategy later is a registration change: it declares `Information` and enters
the same slot without T17 learning its name.

The history handed to a generator is the run count plus the top 25 completed candidates
by total return. That keeps the `0013` promise that future generators can learn from
previous scores, but it is a bounded view rather than the whole experiment table. The
generator still receives actual specifications, not database access, so it can derive
parents or avoid repeats without becoming a repository.

## What else we looked at

**One of every available group** - neat and easy to explain. It fails the day one group is
absent and grows candidates wider whenever a new group appears, which changes the weight
shape and search space as a side effect of adding a strategy.

**Trend plus Momentum plus Structure only** - the example that `0012` names. It is good
for the current registry, but it would keep an Information strategy out of the guided
search until T17 was edited, which is exactly the T25 scenario this architecture is meant
to avoid.

**Passing every tested candidate as history** - most flexible for a future genetic or
Bayesian generator. At ten thousand candidates it turns one method call into a large data
transfer and tempts the generator to behave like a reporting query. A top-result view is
the part learning algorithms usually need first.

## Trade-offs

The context slot treats Structure, Volatility and Information as alternatives. A strong
four-strategy candidate such as MA + RSI + Bollinger + Sentiment will not be produced by
the guided generator until the rule is widened; Random Search can still draw it.

Top 25 by total return is not the final leaderboard formula. T18 may rank on a composite
score later, so an adaptive generator built before then learns from a cruder signal. That
is acceptable for T17 because total return already exists and the final ranking rule is
not settled.

Balanced weights on a 0.1 grid are only approximately equal for three members, so the
first group receives 0.4 and the others 0.3. This keeps the validator and hash stable, but
it gives Trend a small bias that came from the grid rather than from evidence.
