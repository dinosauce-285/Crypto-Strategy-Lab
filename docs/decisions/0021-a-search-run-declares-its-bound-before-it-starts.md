# A search run declares its bound before it starts

## Why this

Section 23 asks for a stop condition and refuses an uncontrolled `while(true)`. The
condition is this: a run carries its bound as data, handed over when it is started, and a
request carrying no bound is refused rather than given a default. A run may be bounded by
a number of candidates, by wall clock, or by both, and it ends the moment the first of
them is met.

The refusal is the part doing the work. A default bound is indistinguishable from no bound
in the only place it matters — nobody reads a default, so the number that stops the run is
one nobody chose. Refusing the request makes declaring a budget an act rather than a
setting, and it makes "this system cannot run an unbounded search" a property of the API
surface, which is a thing that can be demonstrated in thirty seconds, instead of a habit,
which cannot be demonstrated at all.

Putting the bound on the run rather than in configuration follows from what a run is for. A
two-hundred candidate run to see whether the pipeline works and an overnight run against a
year of history are the same machinery asked a different question, and the size of the
answer is part of the question. One number in an environment variable makes them the same
run and forces whoever wants the other one to edit a deployment.

Two more ends exist and neither is a bound the caller declares. A run ends when its source
has nothing left to give, and a run ends when a person stops it. A run may additionally
declare a plateau limit — a count of consecutive candidates that fail to beat the best
result so far — but it stays optional, because it is the only end that depends on results
being comparable, and the scoring formula they would be compared by is still open.

Whatever the reason, the run reports it. Section 32.7 asks whether the loop is running,
and a run that says only "not running" cannot be told apart from one that died. The reason
is what makes stopping legible, and it costs a string.

## What else we looked at

**A fixed limit in configuration** — one `MAX_CANDIDATES` read from the environment,
checked in the loop. It satisfies the letter of section 23 for the price of a line, and
that is its whole case. The bound stops being an answer to "how much are we spending on
this question" and becomes a deployment detail; two runs on one machine cannot differ; and
the number ends up being edited by whoever first finds it too small, in the file nobody
reviews.

**Stop when the results stop improving, and nothing else** — the condition a search
*should* have, and the one a reader expects to see argued here. It cannot be the only stop
condition for two reasons. It depends on a scoring formula that has not been written, so
today it would compare candidates on a number that is still moving. And a generator that
keeps emitting near-identical candidates can improve by a rounding error indefinitely,
which is an unbounded loop with better manners. It survives as an optional third bound,
where being wrong costs a run that ends late rather than one that never ends.

**No stop condition — a person watches it and stops it** — honest about how a lab is
actually used, and it is exactly what the pause and stop controls are for. Section 23
rejects it outright, and the failure it invites is not hypothetical: the run nobody stopped
on a Friday is the one that spends the weekend filling the table with one dataset.

**A budget in worker time rather than in candidates** — closer to what is really being
spent, since candidates differ in cost. It needs a number nobody can supply before the
first backtest has told us how long a backtest takes. Section 32.7 already asks for that
average, so this can be added as a third kind of bound later, against evidence, without
reshaping anything decided here.

## Trade-offs

A bound is a guess made before the evidence exists. The run that would have found its best
candidate at number 201 stops at 200 and nothing in the system will ever mention it. What
is bought in exchange is that no run outlives the attention of the person who started it,
and that is the trade section 23 is asking us to make.

Every caller now has to supply a number, including a demo typed at a terminal and the
screen in T20. The convenience lost is real and is the point; there is no way to keep the
guarantee and also let someone start a run by pressing one button with nothing filled in.

The plateau limit leans on "the best result so far", so it leans on a formula that is not
settled. Until it is, the comparison is total return — a number that exists and means
something, but not the one the leaderboard will eventually rank by. A run that stops on a
plateau is therefore reproducible in its inputs and not in where it chose to stop.

Elapsed time includes time spent paused, so a run paused overnight and resumed in the
morning may end immediately. That is deliberate and it will surprise someone: excluding
paused time would mean a paused run has no bound at all, which is the thing this record
exists to prevent, dressed as a convenience.

> **Narrowed by `0044`.** The danger above is real and is still guarded, but this paragraph
> only weighed charging for paused time against not charging for it, and missed the third
> option of bounding the pause itself. `maxDurationMs` now measures active time, and a
> paused run holds a lease it can outlive only by ending. The paragraph stands as the
> reasoning that made the guarantee non-negotiable; `0044` keeps the guarantee and pays for
> it differently.

Five reasons a run can end is more vocabulary than a boolean, and it is vocabulary that
crosses the wire. Something downstream will eventually branch on the string, and at that
point the set is a contract that cannot be quietly extended.
