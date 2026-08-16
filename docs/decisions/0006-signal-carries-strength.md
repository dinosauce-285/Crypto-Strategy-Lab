# A signal carries a direction and a strength

## Why this

A strategy answers one question per candle: buy, sell, or do nothing. The question
here is whether it may also say how sure it is.

It may. `Signal` is a direction plus a strength between 0 and 1, and a strategy with
nothing to add returns 1.

Two requirements force it. Section 14 asks for a weighted combination of several
strategies. With three discrete values the only thing a weight can multiply is plus
or minus one, so the composite score can only ever land on a small fixed set of
values decided in advance — that is vote counting with fixed coefficients, and
calling it weighted combination in the report would be describing something the code
does not do. Section 30 is worse: sentiment is stored with a score of 0.82 alongside
the article, and a discrete signal would have to flatten that into BUY at the
interface boundary, throwing away the one number that gives that strategy its
meaning.

Strength is a superset rather than a different direction. Every strategy returning 1
behaves exactly like the discrete version, so strength can be added only where it has
an obvious reading — RSI by distance past its threshold, Bollinger by %B, sentiment
by the stored score — and left at 1 everywhere else.

Two things follow from this and belong with the decision rather than beside it.
Strength is a strategy's confidence in itself and is not comparable between
strategies; the composite multiplies it into that strategy's own weight and never
uses it to rank one strategy against another. And a strategy that cannot see yet —
fifty candles needed, ten available — does not express that through the signal at
all. It declares its warm-up length in its metadata and the engine does not call it
until the data is there, so "do nothing" keeps its single honest meaning.

## What else we looked at

**Three discrete values** — the shape the brief itself sketches in section 6, and the
one a reader expects us to take. It is the cheapest to build and impossible to
misread: `BUY` explains itself, and nobody has to invent a scale. It loses on the two
requirements above, and changing it afterwards means editing every strategy that
exists — which is the section 41 scenario, failed on our own contract.

**A single number from -1 to +1** — tidier arithmetic, since the composite is then a
plain weighted sum with nothing to encode. It collapses two different states onto
zero: "I have no opinion" and "both sides balance out". Those differ when votes are
counted, and section 13 presents majority vote as a legitimate way to combine, so
losing the distinction costs an option the brief offers. Reading `-0.35` in a test
failure also tells you far less than reading `SELL`.

**Direction, strength, and a reason string** — a text explanation each strategy
attaches for the chart, serving section 25. The string is unusable by anything except
display, and the indicator values the chart needs are already produced by the
indicator service. The field is optional by nature, so it can be added the day
something needs it.

## Trade-offs

There is no common scale. A 0.8 from the moving-average strategy and a 0.8 from the
support/resistance strategy mean different things, yet the composite adds them into
one total. The convention above contains the damage rather than removing it, and it
holds only as long as people follow it.

The field is dead weight unless the composite actually multiplies by it. If the merge
rule ends up counting votes, we are left with a field in the shared contract that
does nothing and misleads every reader into thinking it does something — strictly
worse than having chosen the discrete version. That is why the merge rule is settled
in the same sitting rather than left to whoever picks up the composite.

Every author of a new strategy now has one more thing to decide, and for some
indicators there is no natural answer. A crossover either happened or it did not; any
strength assigned to it is a judgement about how far the lines have separated, not a
fact. Returning 1 is always available, but the question now has to be asked each time
where before it did not exist.
