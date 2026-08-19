# Signals are combined by weighted score only

## Why this

Three strategies look at one candle. MA says buy, RSI says sell, support/resistance
says buy. The composite has to answer once.

Section 13 raises vote counting and section 14 spells out the weighted alternative:
encode buy as +1 and sell as −1, multiply by that strategy's weight, add up, compare
against a threshold. Section 14 requires the weighted form and requires the
calculation to be written out, so weighted is not optional.

The question was only whether vote counting joins it, and it does not. `0006` decided
a signal carries a strength so a sentiment score of 0.82 is not flattened into a bare
BUY. Vote counting discards that number at the moment of combination, which would
leave the report describing a weighted combination the code does not perform.
Supporting both would mean one rule that uses strength and one that throws it away,
with no honest way to compare their results on one leaderboard.

So each member contributes `direction × strength × weight`, and the sum decides:

```
|score| > threshold   →  act on the sign
otherwise             →  HOLD
```

One line covers both directions, and the comparison is strict — a score landing
exactly on the threshold is still at the edge of indecision, which is what the
threshold was defined to mean.

**The score is rounded to six decimal places first.** Without that, whether a score
"equals" the threshold is settled by binary floating point: `0.5 - 0.2` is
`0.30000000000000004`, so the same logical situation — agreement landing exactly on
the line — resolves differently depending on which weights happened to produce it. It
stays deterministic, so a re-run matches, but it is arbitrary. Six places, the same
convention used before hashing.

**The composite's own strength is `|score|`.** A composite is a strategy and has to
answer with a strength like any other. The score already lives in −1..1 and already
means how convinced the group is, so nothing has to be invented, and a composite
nested inside a composite works with no extra rule.

Three properties of the weights follow, and each prevents a failure that is invisible
once it happens.

**They sum to 1.** The threshold has to mean the same thing whatever a candidate is
made of. Unnormalised, two members agreeing score 2 while five agreeing score 5, so a
fixed threshold gets easier to clear the more members you add and the board fills with
crowded candidates for a reason nobody can see.

**They are strictly above zero.** A member weighted 0 contributes nothing, making that
candidate identical in behaviour to the smaller one without it — one strategy holding
two rows and costing two backtests.

**They sit on a grid of 0.1.** Continuous weights give every draw a different hash, so
duplicate detection never fires and the board fills with rows differing in the fourth
decimal. With whole tenths and members above zero there are 9 weight sets for two
members, 36 for three, 84 for four.

## What else we looked at

**Majority vote as a second rule** — the brief itself raises it in section 13, so
leaving it out has to be said rather than assumed. It is simpler, and a report can
claim the system supports several combination rules. It loses on the strength question
above, and on what honesty would cost: results from two rules on one leaderboard are
not comparable, so either the rule joins the dataset identity or the board silently
mixes two kinds of thing. Adding it later is one array element.

**Weights derived from past performance** — let better-scoring strategies earn more
weight. Attractive, and it is what a learning generator would eventually do. It belongs
to the generator and its history (`0013`), not to the combination: doing it inside the
composite would make a candidate's behaviour depend on which runs happened before it,
so the same candidate would score differently depending on the order of the search.

**Weights as free real numbers** — the widest search, and it makes `specHash` useless
because nothing ever repeats.

**Normalising a member's contribution by how often it speaks** — the fair-sounding
answer to a crossing being outvoted by a state that holds for twenty candles. It cannot
be done: at candle N you do not know how often a member will speak without looking
ahead, which rule 7 forbids, and computing it from what came before makes a candidate's
result depend on the stretch of data in front of it. The problem is real; `0015` solves
it a different way.

## Trade-offs

There is one merge rule, so the ability to swap it is claimed rather than demonstrated.
A second value costs one array element, but until one exists nobody has proved the seam
holds.

A grid of tenths cannot express a genuinely better 0.37. We are betting that gap is
smaller than the noise in a backtest, which is likely and unmeasured.

Normalising means a person typing 2, 1, 1 gets 0.5, 0.25, 0.25 stored, and the numbers
they see afterwards are not the numbers they typed. It has to happen before hashing, or
one candidate arrives under two identities.

The strict comparison plus rounding means a candidate can sit just under the threshold
for a whole run and never trade, showing up on the board as a strategy that did nothing
rather than as one that nearly acted. Nothing distinguishes those two on the leaderboard.
