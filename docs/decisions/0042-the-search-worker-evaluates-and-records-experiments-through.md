# the search worker evaluates and records experiments through EvaluatorPort, not its own repository

## Why this

BUG-01: every Search candidate failed at the evaluation step (15 tried, 15 failed, all
with the same error). `BacktestProcessor` (T12's worker) depended on `RunEvaluator`
(`score(trades, datasetId): Promise<Metrics>`), an abstract port with zero implementations
anywhere in the repo, and nothing bound it in `backtest-worker.module.ts`. T13's real
evaluator, `EvaluatorService`, implements a different port entirely — `EvaluatorPort`,
with `computeMetrics`, `evaluateAndRecord` (computes and persists atomically), and
`recordFailed`. The two never got reconciled while T12 and T13 were built in parallel.

`EvaluatorPort` was already the correct contract: `BacktestService.runSingle` (the
single-run screen) already injects it directly and works. The worker's own persistence,
`ExperimentRepository`, was a byte-for-byte duplicate of `EvaluationRepository` — both
write the same `Experiment`/`Trade` rows. `EvaluationRepository`'s own comment calls
itself "the only place the evaluation module touches the database," which the worker's
copy was already quietly violating. `EvaluatorPort` including `recordFailed` was the
signal that the evaluation module was meant to own all experiment persistence, not just
the completed-run half of it.

So the fix is to retarget the worker onto `EvaluatorPort`, the same way the single-run
path already does, and delete the two files that existed only to route around a port
mismatch: `RunEvaluator` and `ExperimentRepository`.

## What else we looked at

**A local adapter implementing `RunEvaluator` that delegates to `EvaluatorPort`
internally** — keeps `RunEvaluator` alive as a second shape for the same concept
(scoring trades against a dataset) and leaves `ExperimentRepository`'s duplicate
persistence in place. It would have made the immediate bug go away with a smaller diff,
but it papers over the mismatch instead of removing it, and the next person touching
either port would still have to figure out which one is real.

**Keep `ExperimentRepository`, use only `EvaluatorPort.computeMetrics()` as a pure
function** — the worker would compute metrics through the shared calculator but keep
writing `Experiment`/`Trade` rows itself. This avoids extending `EvaluatorPort`, but
leaves two independent code paths writing to the same table, which is exactly the kind
of duplication `EvaluationRepository`'s own database-ownership comment was written to
rule out. Any change to how a completed or failed experiment is recorded would need to
land in both places or drift.

## Trade-offs

`EvaluatorPort` gains an `isRecorded(datasetId, specHash)` method it didn't have before,
purely to preserve the worker's existing optimization of skipping an already-tried
candidate before running its backtest simulation — `BacktestService.runSingle` doesn't
need this (a single interactive run isn't re-trying candidates), so the port now carries
a method only one of its two consumers uses. The worker process (`backtest-worker.module.ts`)
now depends on `EvaluationModule`, which pulls in `PrismaModule` a second time — harmless,
`PrismaModule` is `@Global()` and the worker already depended on it directly, but it is
one more module in the graph a reader has to trace. `ExperimentRepository` and
`RunEvaluator` are deleted outright rather than deprecated, on the basis that BUG-01
proved nothing depended on the working state of either.
