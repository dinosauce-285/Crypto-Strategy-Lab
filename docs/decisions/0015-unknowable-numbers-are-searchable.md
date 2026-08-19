# A number nobody can argue is put in the specification and answered by the leaderboard

## Why this

Two numbers came out of the combination rule, and neither has a defensible value.

The decision threshold is one. Section 14 uses 0.3 as an example and says outright
that a team may design its own method, so 0.3 is not derived from anything. Worse, it
behaves inconsistently in a way nobody chose: a single member speaking alone scores
0.5 with two members, 0.33 with three and 0.25 with four, so at 0.3 a lone voice acts
in a three-member candidate and is ignored in a four-member one.

How long a crossing keeps speaking is the other. A moving-average cross happens on one
candle; RSI below 30 is a state that holds for twenty. Added straight, the member that
repeats itself decides the composite and the crossing is outvoted the moment it speaks
— not on merit, on frequency. Fading the crossing's strength over the following candles
fixes it, and `0006` gives strength exactly that room. But how many candles is another
number with no argument behind it.

Asking a person to type either one does not work. Weights can be argued — *I trust
support and resistance more than RSI* is a sentence somebody can mean. A threshold is a
number about a score the user has never seen, and a decay length is a guess about how
long a signal stays interesting. Putting either in a form asks for a guess and then
records it as a choice.

So neither is decided by argument. Both become part of what a candidate *is*, and the
leaderboard answers them:

- `threshold` is a field on `CandidateSpec`, above 0 and below 1, on a grid of 0.1
- decay length is an ordinary parameter declared in a strategy's metadata with a range,
  so `decay: 0` is the old fade-nothing behaviour

The consequence is the point. `MA+RSI @0.3` and `MA+RSI @0.5` are two candidates on one
dataset, sitting on one board, differing in one number. Reading which is better is
reading two rows.

Keeping them as constants in code would have made that impossible. Trying a second
threshold would mean editing the composite, which changes what it does, which bumps its
version under `0009` — and now the five results being compared come from five versions
of the composite, none of which can be put beside the others honestly. The question
would have to be answered by copying numbers onto paper, which is how it gets answered
badly.

Nothing draws these on day one. The first generator fixes the threshold at 0.3 and the
decay at its default, exactly as it leaves weights equal, so the search reaches a working
leaderboard before it starts spending its budget on extra dimensions. Opening them is a
change inside the generator; the specification, the worker and the screens do not move.

**Reading the answer is where this goes wrong.** Picking whichever threshold scored best
on one dataset is the definition of overfitting — it fits the number to that stretch of
data. The check is cheap: run it on two or three datasets, a different timeframe and a
different month. If 0.4 wins everywhere it is real. If a different value wins each time,
the threshold does not matter much, and the right conclusion is to keep 0.3 and record
that it was measured and found insensitive. That second outcome reads like a failure and
is not one: knowing which knobs are not worth turning is knowing the system.

## What else we looked at

**Leaving both as constants and picking by argument** — no extra field, no extra search
dimension, and the report can state a number. It answers the question with an opinion in
a project whose entire purpose is answering questions with experiments.

**Asking the user on the single-run screen** — the form already collects strategies and
parameters, so a threshold box costs nothing to add. It costs something to answer: the
user has no basis, so the box collects a guess and dignifies it. It becomes reasonable
only if the screen also draws the composite score per candle with the threshold lines on
it, so the number is visible and adjustable by eye. That is worth building in T14, and it
is a different thing from asking cold.

**A separate `signalKind: 'event' | 'state'` on strategy metadata**, with the composite
treating the two differently — the explicit version of the fade. It reads more clearly
than a decaying number, and the composite could hold an event signal for a fixed window.
Rejected because it puts a second branch inside the combination and adds a field to a
shared type to describe something the strategy can already express through the strength
it returns. The strategy knows how long its own signal stays meaningful; the composite
does not.

**Making the decay a fixed 0.7 / 0.4 / 0.2** — one less parameter, and honest enough for
a demo. It is the same unargued number one level down, and the search engine is right
there.

## Trade-offs

Every dimension multiplies the search. A threshold on five values and a decay on eleven
widen a three-member candidate's space by 55 on top of the 36 weight sets. Random Search
samples rather than enumerates, so the ceiling stays the stop condition in T19 — but the
chance of drawing the same candidate twice falls, which means `specHash` catches fewer
duplicates and more budget goes to points that teach nothing.

Every event-style strategy now has to implement its own fade. A strategy that forgets
silently reverts to being outvoted by its state-like neighbours, and nothing catches it.

`strength` now carries two meanings at once — how sure a strategy is, and how recent its
signal is. Both are honestly *how much weight my opinion deserves right now*, but they
are not the same thing, and a reader who is only told the first will misread the second.

The overfitting check is a discipline, not a mechanism. Nothing in the system stops
someone reading the top row of one leaderboard and calling it the answer.
