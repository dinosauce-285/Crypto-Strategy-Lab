# A paused run stops spending its budget and holds a lease instead

Narrows `0021-a-search-run-declares-its-bound-before-it-starts`, which decided the opposite
and said so on purpose. The reasoning it gave is kept below, because it was right about the
danger and wrong only about the choices available.

## Why this

A run bounded at twenty seconds, paused at second eight, ended anyway at second twenty with
`endReason: "duration"`. The twelve seconds it spent paused were charged to a budget that
exists to limit how much backtesting is done, during which no backtesting was done. Someone
pausing to read a result loses the rest of their run for having looked at it, which is the
opposite of what the button is for, and section 24 lists `pause loop` and `resume loop` as
things this architecture is supposed to make possible.

The two bounds already disagreed with each other. `maxCandidates` compares against
`counters.tried`, and a paused run queues nothing, so the candidate budget stops moving
while paused. `maxDurationMs` compared against `now - startedAt`, so the time budget kept
moving. Two numbers a caller declares in the same object, meaning the same thing — how much
this question is allowed to cost — and one of them charged for idleness while the other did
not. Whatever the right answer is, they cannot both be it.

So `maxDurationMs` now measures active time: a run accumulates the milliseconds it spent
paused and they are subtracted before the bound is checked. A paused run is not asked
whether it has reached any bound at all; the only things that can end it are a person
stopping it and the lease below.

The lease is the half `0021` was protecting and it survives intact. A paused run holds a
lease of `MAX_PAUSE_MS`, and a run still paused when it expires ends with
`endReason: 'abandoned'`. There is no path by which a run outlives the attention of whoever
started it, which is the guarantee `0021` exists to make; it is now made by bounding the
pause rather than by charging for it.

`abandoned` is a sixth value in `RUN_END_REASONS` and it earns the string by the argument
`0021` itself makes for the other five: a run that reports only "not running" cannot be told
apart from one that died, and section 32.7 asks. Ending because nobody came back is not the
same event as a person pressing stop, and a screen that renders them identically is hiding
the more interesting of the two.

## What else we looked at

**Leave it as `0021` decided it** — the position being narrowed here, and it is not a silly
one. It is unambiguous, it needs no new state, and a run cannot possibly outlive its budget.
It fails on the same evidence that motivated it: `maxCandidates` sitting in the same object
already behaves the other way, so "elapsed time includes time spent paused" was never a
consistent rule, only an unexamined one. `0021` reasoned about the danger of an unbounded
pause and concluded the bound had to keep running, without noticing that bounding the pause
itself was on the table.

**Auto-resume when the lease expires** — cheapest of all: no new end reason, no contract
change, the run simply carries on and ends by the bound it already declared. It was rejected
for being a hidden actuator. A person pauses to read a result, goes to lunch, and comes back
to a run that resumed without being asked and may have finished. That trades a predictable
annoyance for an unpredictable one, and a state transition nobody requested is a worse thing
to own than the bug being fixed.

**Require a `maxPauseMs` on the pause request** — the most faithful reading of `0021`'s own
move, which was to refuse a request rather than supply a default. It does not transfer.
`0021` refused a default for the run budget because the budget *is* the question being asked
and the person asking has an opinion about it. A pause duration is not a question, it is an
interruption, and demanding a number at the moment somebody wants to stop and look at
something is ceremony that produces no insight. It also puts a form behind a button whose
whole value is being instant.

**A paused run stops holding the slot, so it needs no lease** — a run can be paused
indefinitely as long as starting a new one supersedes it. This removes the problem rather
than solving it, and it removes it by silently destroying a paused run's remaining budget on
someone else's action, which is a worse surprise than the one being fixed. A paused run also
still holds queue state, so "harmless" is not quite true.

**`MAX_PAUSE_MS` declared per run rather than as a constant** — consistent-looking, and
premature. `0021`'s objection to defaults is that nobody reads them, and it is right about a
budget, where the default silently decides what gets spent. A lease is a safety net: nobody
chooses it, it decides nothing about cost, and its only job is to stop a state from lasting
forever. It becomes a declared value the first time somebody has a real reason to want a
longer pause, and that reason will be evidence rather than symmetry.

## Trade-offs

`endedAt - startedAt` no longer equals the budget that was spent, and anything reading those
two fields to compute how long a run took now gets wall clock rather than work. That is the
honest number for "how long was this thing alive" and the wrong one for "how much did it
cost", and the second is not exposed anywhere. Whoever needs it will have to add it, and
until they do the difference is invisible and will be misread at least once.

`RUN_END_REASONS` now has six values, and `0021` warned that this set becomes a contract that
cannot be quietly extended. It has been extended loudly, which is what that warning asked
for, and the cost is real: every consumer branching on the reason has a case it has not seen,
and a screen that renders five reasons will render the sixth as nothing at all.

A run can now end while nobody is watching it and for a reason that is nobody's decision.
`stopped` has an author; `abandoned` does not, and the difference will matter to whoever is
asked why a run ended and finds that the honest answer is "it was left alone too long".

The pause accounting is kept in memory on `ActiveRun`, like the rest of a run's state, so a
process restart loses it along with the run itself — which `0021` already accepted. It means
the lease cannot survive a deploy, and a run paused before one is gone rather than abandoned.

`MAX_PAUSE_MS` is one number chosen with no evidence, exactly the kind of number `0021`
refuses elsewhere. The defence is that being wrong costs a paused run that ends earlier than
someone wanted, which is recoverable by starting another, rather than an unbounded loop,
which is not.
