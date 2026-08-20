## Why

Section 23 rejects an uncontrolled `while(true)` outright and section 24 draws the chain
the search has to run on — Generator → Queue → Worker → Evaluator → Ranking. Nothing in
the repo runs work off a queue yet: every module so far answers a request or pushes a
tick, and section 43's ten thousand candidates cannot be tested one at a time inside the
API process.

It is built now, before the pieces that fill it, because it is the seam four other tasks
land on. T11 rebuilds a strategy, T17 supplies candidates, T12 runs a backtest, T13 scores
it; each of those plugs into a port this change defines rather than growing a loop of its
own. Built later, in whatever order those finish, the loop is written around whichever one
landed first.

It also opens slice 3 while slice 1 is still open, which the workflow otherwise forbids.
The breakdown makes the exception itself — T11 and T19 are named there as shared
infrastructure with no screen of their own, so neither can close a slice and neither can
wait for one. What this change does not get to claim in exchange is a demonstration: until
the four ports have implementations, the loop is exercised against temporary ones and then
runs empty.

T19 · [The continuous loop](https://trello.com/c/pLJrAZjQ/10-t19-the-continuous-loop).
Brief: section 23, section 24, section 32.5, section 32.7, section 43, section 40
question 4, section 45 §4 `ADR-003`.

## Decisions

**Settled**

- [0004](../../../docs/decisions/0004-bullmq-for-backtests.md) — BullMQ on Redis, and
  separate processes rather than threads. Retry, pause, resume and failure counts come
  from the library; this change wires them and does not reopen the choice.
- [0007](../../../docs/decisions/0007-candidate-as-spec.md) — what crosses the queue is a
  specification, rebuilt into a runnable strategy inside the worker. It also names three
  consequences this change is the first to meet: a validator has to exist, the two kinds
  of failure must not be treated alike, and identity depends on hashing a normalised
  specification.
- [0013](../../../docs/decisions/0013-generator-receives-history.md) — the generator is
  handed the history of previous rounds. That fixes the shape of the port the loop pulls
  candidates through, so T17 implements an interface rather than proposing one.
- [0010](../../../docs/decisions/0010-dataset-carries-the-backtest-rules.md) — a run is
  measured against a dataset id, which is why a job is a pair and not a single object.
- [0011](../../../docs/decisions/0011-leaderboard-is-recomputed.md) — the loop stores no
  score and no rank. It writes experiments; ranking is a read, and belongs to T18.
- [0003](../../../docs/decisions/0003-in-process-event-bus.md) — the four events this
  change emits are notification, not work. Nothing downstream is called directly.
- [0017](../../../docs/decisions/0017-one-push-channel-addressed-by-topic.md) and
  [0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md) — loop
  progress reaches the browser as one more topic on the existing channel. That the channel
  needs no change to carry it is the thing those two records were written to buy.

**To settle** — one new record and two open details that belong inside records that
already exist, all written before the code that assumes them:

- **The stop condition** — the choice section 23 marks and question 4 asks. What bounds a
  run, whether a run may be started without one, and what a run reports when it ends. New
  record. Task 0.1.
- **Which end of the queue validates a specification, and what happens to one that is
  malformed** — both left open inside `0007`, and section 32.7 cannot count what is
  silently dropped. Added to `0007`, which is where the reasoning already lives. Task 0.2.
- **How a specification is normalised before it is hashed** — left open inside `0009`.
  The loop is the first code that needs a `specHash`, and two spellings of one candidate
  fill the leaderboard with duplicates. Added to `0009`. Task 0.3.

## What Changes

- **New `search` module in apps/api** — the run: it pulls candidates from a source port,
  enqueues each as a job, watches the queue, and stops the moment a bound is reached.
  Start, pause, resume, stop and status are HTTP; pause and resume act on the queue, so
  they hold across processes rather than only inside the one that took the request.
- **A worker that runs in its own process** — `pnpm worker`, bootstrapping the same
  codebase with a different module. It validates the specification, hashes it, skips a
  candidate already tested on that dataset, runs the backtest, evaluates it and writes the
  `Experiment` row itself. Concurrency is configuration, and several workers may run.
- **Four ports for the work this change does not own** — `CandidateSource` (T17),
  `StrategyFactory` (T11), `BacktestRunner` (T12) and `RunEvaluator` (T13). None is
  implemented here. A run started with no source registered ends immediately with the
  reason "exhausted" and zero tried, which is the honest state rather than a fake one.
- **Failure is classified, not uniform** — a specification naming a strategy that does not
  exist, a dataset that is not there, or a shape the validator rejects is permanently
  broken and is not retried; a dropped connection is. A permanent failure is written as a
  failed experiment so section 32.7's count comes from a table rather than from a log.
- **Orphaned jobs are cleared at boot** — a run belongs to the process that started it, so
  jobs left in Redis by a previous process are discarded before a new run begins. Without
  this the "no unbounded loop" guarantee is only true until the API restarts.
- **`@csl/contracts` gains the run's vocabulary** — the bound a run declares, the reason it
  ended, the counters of section 32.7, the loop message on the wire and its topic, and the
  canonical form a specification is hashed from. `BacktestJob` is already there from T02
  and is used unchanged.
- **No database change.** The `Experiment` row, its `error` column and the unique
  `(datasetId, specHash)` pair all exist from T03; that constraint is what makes "already
  tested" a fact rather than a bookkeeping exercise.
- **No screen.** T21 is the monitoring page and owns the controls; this change ends at an
  endpoint and a topic, which is what T21 reads.

## Capabilities

### New Capabilities

- `search-loop`: how a search run is bounded, started, paused, resumed and stopped; what
  happens to a job that fails; and what the run reports while it is running.

### Modified Capabilities

None. `realtime-channel` carries loop progress without changing: a topic is opaque to it,
which is exactly what its third requirement promises.

## Impact

- `packages/contracts/src/` — a new `search` module and a loop message on the wire,
  exported from the index. Rebuilt before either app compiles.
- `apps/api/src/search/`, `app.module.ts`, and a second bootstrap entry for the worker.
- Dependencies: `bullmq` and `ioredis` in apps/api. Redis itself is already running
  locally on 6379; `REDIS_URL` joins `.env.example`.
- Scripts: `pnpm worker` beside `pnpm dev`, and the README's run instructions gain a
  second process — a cost `0004` accepted in writing.
- The pre-push decision gate fires on the contracts change and the new module; the record
  and the two amendments are in the same push.
- Downstream: T11 registers a `StrategyFactory`, T17 a `CandidateSource`, T12 a
  `BacktestRunner` and T13 a `RunEvaluator` — each is one provider line. T18 reads the
  experiments this writes. T21 draws the counters and calls the four control endpoints.
- Overlapping ground to settle with the people who own it: the control endpoints here are
  what T20's screen calls, and the canonical form of 1.2 fixes how T11 hashes a member's
  parameters. Neither is a second implementation, but both are somebody else's card.
