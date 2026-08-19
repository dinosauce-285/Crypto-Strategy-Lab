# The generator is handed the history of previous rounds, and the random one ignores it

## Why this

`generate()` produces the next candidate to test. The first implementation is random —
pick a few strategies, pick numbers in their declared ranges, return the combination —
and random needs nothing but the metadata of `0012`. On that evidence the argument
takes no history at all.

The argument for handing it history anyway is section 42, which sets the scenario
outright: replace the candidate generator with a different one and see how much of the
rest has to change. Every generator that improves on random — genetic, bayesian,
evolutionary — works by looking at what has already been tried and how it scored. If
the signature takes nothing, the day one of those is written is the day the interface
changes, and the interface is the exact seam the scenario is measuring. One unused
argument costs a line; changing the seam costs the answer to the question being asked.

So the signature takes the history, and the random generator ignores it. That sentence
is also the demonstration: a generator that does not care is unaffected by the argument
being there, which is what makes it safe to add before anyone needs it.

The history is kept as narrow as it can be while still being useful: **the candidates
already tested, with their scores**. Not a search state, not a generation counter, not
an elapsed budget — those are guesses about an algorithm nobody has written yet, and a
guess baked into a shared type is worse than an absence.

## What else we looked at

**`generate()` with no argument** — nothing unused, nothing speculative, and honest
about what random actually needs. It loses on timing rather than on cleanliness: the
change it defers is a change to a shared interface, made later, at the seam section 42
inspects. Deferring a cost does not reduce it here; it moves it somewhere more
expensive.

**Give the generator a repository so it can query whatever it likes** — maximally
flexible, and never needs changing again. It puts a component that should only think
about combinations back in the business of reaching into storage, which is the
anti-pattern section 44 names for strategies and which `0008` spent a decision avoiding.
The same reasoning has to apply here or it was not a principle.

**A rich search-state object — population, generation number, elapsed time, budget
remaining** — anticipates the genetic case properly. Every field is a bet on how an
unwritten algorithm will be structured, and a wrong bet is not free: it ships in the
shared contracts package and every generator has to accept it.

## Trade-offs

There is an unused parameter in the code from day one. It reads as speculative, and the
only thing that makes it defensible is this record explaining why — which is precisely
the kind of thing a reader assumes was an accident when the record is missing.

The shape of the history is a guess made without a consumer. A genetic generator may
want parent links or generation numbering, and adding those is a change to the very
interface this decision was protecting. What we have bought is that the *first* such
generator does not force the change; we have not bought immunity.

Passing every tested candidate does not survive contact with ten thousand of them. The
history has to be a bounded view — a top-N with a count, or something the generator can
page through — rather than the full list, and exactly which is a detail left to T17. If
that detail is settled badly, the argument becomes expensive to pass on every round.
