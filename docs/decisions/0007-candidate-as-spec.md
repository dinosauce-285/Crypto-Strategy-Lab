# A candidate strategy travels as data, and is built into an object only to run

## Why this

A candidate is a specification — which strategies, which parameters, which weights,
which merge rule — and a factory turns that specification into a runnable strategy
inside the worker that is about to backtest it. The runnable object is never stored
and never sent anywhere.

This was already decided in effect by `0004`. Work reaches a backtest worker through
a queue, and everything crossing that queue is serialised. An object's methods live
on its prototype, not in its fields, so serialising one keeps the numbers and drops
the behaviour; the worker receives a shell that throws the moment it is asked
anything. Keeping candidates as live objects means keeping everything in one process,
which means one worker, which gives up the parallelism section 43 is built around.

What makes the specification the better shape rather than merely the possible one is
that three jobs need the same thing. Section 15 generates candidates, section 24
pushes them through a queue to workers, and section 35 stores them in an experiment
row. A specification serves all three unchanged, and the third is what answers
section 36 and question 8 of section 40: an old result does not record a strategy's
name, it records the full recipe, so it can be rebuilt exactly months later. The
worker already contains the code for every strategy — it runs the same program — so
the only thing it lacks is which ones to assemble and with what numbers.

Two details left open here are settled now that a queue exists to settle them against. The
validator runs at the **receiving** end, inside the worker, immediately before the
specification is built. The sending end cannot be the place, because there is no single
sending end: a generator enqueues candidates today, a person retries one by hand tomorrow,
and a validator on the sender protects only against the sender that remembered to call it.
The worker is where the untyped value becomes an object, so it is where the check is worth
anything.

And a specification the validator rejects is **written as a failed experiment**, not
dropped. Section 32.7 asks how many jobs failed, and an answer assembled from log lines is
not an answer. The row costs one insert on a path that is already writing rows, it carries
the reason in the column T03 gave it, and it means the failure count and the results come
from the same table rather than from two accounts that can disagree.

The dataset is deliberately not part of the specification. A specification answers
what the strategy is; a dataset answers what it ran on. They are sent together as a
pair and stored as separate columns. Folding the dataset in would make one strategy
run on two date ranges look like two different strategies, and would destroy the
ability to ask whether a candidate does better on the 5-minute or the 1-hour frame —
which is among the more interesting questions the system can answer.

## What else we looked at

**Keeping the live object** — no serialising, no rebuilding, and no gap between what
was generated and what runs. It works, and would be the obvious choice if the search
loop ran in one process. It cannot cross a queue, cannot be written to a column, and
cannot be reconstructed later, so it fails all three jobs above rather than just the
first.

**A serialisable object with methods restored after transport** — send fields, then
re-attach the prototype on the far side. This is the specification-and-factory
approach wearing a disguise, with the reconstruction hidden inside the type instead
of stated as a step. It costs the same and explains itself worse.

**Storing generated source code for each candidate** — maximally faithful, since the
stored artefact is the thing that ran. It turns every backtest into code execution
from the database, which is a security problem we have no reason to take on, and
makes comparing two candidates a diff of text rather than of fields.

## Trade-offs

The compiler stops helping at the boundary. Data arriving from the queue is untyped
at runtime, and asserting a type on it checks nothing. A validator has to be written
and kept in step with the shared type by hand, and a malformed specification is
discovered when it is built rather than when it is written.

Validating at the receiving end means a bad specification is caught after it has been
queued, waited and been picked up, rather than at the moment it was written. The generator
that produced it is long gone by then, and the only thing pointing back at it is the reason
stored on the failed row.

Recording a rejected specification also depends on it carrying a dataset that exists,
because an experiment is a row against a dataset. A job malformed enough to lose that has
nowhere to be written and can only be counted in the run that queued it — so the failure
count is one table plus one number held in memory, and the number does not survive a
restart. The alternative was a table for runs, which is a schema change bought to make a
rare failure tidy.

Failures now come in two kinds that must not be treated alike. A specification naming
a strategy that does not exist is permanently broken and must not be retried; a
dropped connection is temporary and must be. The queue retries everything by default,
so getting this wrong means a bad specification is retried until it exhausts its
attempts, or forever if attempts are unbounded.

Identity depends on serialising consistently. The same candidate written with its
fields in a different order hashes differently, and the search engine then re-tests
combinations it has already seen without noticing. Field order, member order and
floating-point precision all have to be normalised before hashing — a small piece of
work that is invisible until the day the leaderboard fills with duplicates.

There is now a construction step that can fail in the middle of a run, in a place
that did not previously exist.
