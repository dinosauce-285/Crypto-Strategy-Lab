## 0. Decisions

- [x] 0.1 `pnpm decision "A search run declares its bound before it starts"` — the stop
      condition section 23 marks and question 4 asks. Which bounds a run may carry, why a
      request without one is refused rather than defaulted, the five reasons a run can
      end, and what a bound costs (a run that could have found more stops anyway).
- [x] 0.2 Amend `docs/decisions/0007-candidate-as-spec.md` — the two details it left open:
      the validator runs at the worker end, and a specification that fails it is written as
      a failed experiment rather than dropped, because section 32.7 counts from the table.
      Keep it to the record's three sections; do not add a fourth.
- [x] 0.3 Amend `docs/decisions/0009-strategy-versioning.md` — the canonical form a
      specification is hashed from: key order, member order, and how many decimal places a
      weight or threshold is rounded to first. Two spellings of one candidate must hash
      alike or the leaderboard fills with duplicates.

## 1. The run's vocabulary

- [x] 1.1 `packages/contracts/src/search.ts` — the bound a run declares, the reason it
      ended, and the counters of section 32.7 as one status shape. Nothing about queues or
      Redis: this is what a screen and an endpoint agree on.
- [x] 1.2 `canonicalSpec(spec)` in the same file — the normalisation from 0.3, returning
      the string that is hashed. It lives beside `CandidateSpec` because identity belongs
      with the value, and it does no hashing itself so nothing pulls `node:crypto` into
      the browser bundle.
- [x] 1.3 Wire additions in `packages/contracts/src/wire.ts` — a search progress message
      under the existing envelope and a topic builder for a run id. The channel is not
      touched: a topic is opaque to it, which is the point of `0017`.
- [x] 1.4 Export from `packages/contracts/src/index.ts`, then `pnpm build:contracts`.

## 2. The queue

- [x] 2.1 Add `bullmq` and `ioredis` to apps/api. `REDIS_URL` in `apps/api/.env.example`
      and in the local `.env`; Redis is already running on 6379, so nothing is installed.
- [x] 2.2 `apps/api/src/search/backtest-queue.ts` — one queue, its connection from config,
      and the job options that make `0004`'s retry real: a bounded attempt count with
      backoff, and completed jobs removed so Redis does not grow for the length of a run.
- [x] 2.3 Clear orphans before a run starts — jobs left by a process that no longer exists
      belong to no bound, and processing them would break the guarantee 0.1 is written to
      make. A paused queue is orphaned state too: pause lives in Redis and the run that
      ordered it lives in memory, so a restart during a pause leaves a queue nobody owns.
- [x] 2.4 `apps/api/src/search/ports/` — four abstract classes, none implemented here.
      `CandidateSource` (T17) takes the history of `0013` and returns the next candidates;
      `StrategyFactory` (T11) turns a specification into something runnable, and is the
      port that reports a member nobody registered; `BacktestRunner` (T12) turns that and a
      dataset into trades; `RunEvaluator` (T13) turns trades into metrics. The factory is
      separate from the runner because the card puts rebuilding the strategy in the worker,
      and because "this strategy does not exist" is a permanent failure — a classification
      that belongs where 4.5 makes it.

## 3. The run

- [x] 3.1 `apps/api/src/search/run-bounds.ts` — a pure function from the run's counters to
      an end reason or nothing. No queue, no clock injection beyond a passed timestamp, so
      the stop condition is readable on its own and testable without Redis.
- [x] 3.2 `apps/api/src/search/search.service.ts` — hold the single current run, pull from
      the source, top the queue up rather than enqueueing ten thousand jobs at once, and
      close the run when 3.1 says so. Pause and resume act on the queue so they hold across
      processes; stop drains what is waiting.
- [x] 3.3 Completion arrives through the queue's own events, not the in-process bus — the
      worker runs in another process, so `0003`'s bus cannot cross. Turn those into the
      section 34 events on the API's bus (`BacktestStarted`, `BacktestCompleted`,
      `StrategyEvaluated`) so T18 subscribes to an event rather than to BullMQ.
- [x] 3.4 Publish the status on the run's topic through `ChannelPublisher` whenever a
      counter moves, and once more when the run ends. The service names a topic and knows
      nothing else about the browser — `0020`.
- [x] 3.5 `search.controller.ts` and `dto/` — start, pause, resume, stop, status. A start
      request with neither bound is refused here, before anything is queued.
- [x] 3.6 `search.module.ts` imports `RealtimeModule`, exports nothing, and is registered
      in `app.module.ts`.

## 4. The worker

- [x] 4.1 `apps/api/src/search/worker.main.ts` and `backtest-worker.module.ts` — a second
      bootstrap of the same codebase with no HTTP server, plus a `worker` script in
      apps/api and at the root. This is `0004`'s "separate processes, not threads" made
      literal.
- [x] 4.2 `apps/api/src/search/spec-validator.ts` — the structural check `0007` says has to
      exist: shape, member fields, weights above zero on the 0.1 grid summing to 1, and the
      threshold inside its range. It runs at the worker end, per 0.2.
- [x] 4.3 `apps/api/src/search/backtest.processor.ts` — validate, hash, skip a candidate
      already recorded against that dataset, run it through the runner port, evaluate it,
      write the row, and return a summary for 3.3 to read. A missing port implementation is
      a permanent failure with a reason that names the task that supplies it.
- [x] 4.4 `apps/api/src/search/experiment.repository.ts` — the only place this module
      touches Prisma: the completed row with its metrics and trades in one transaction, the
      failed row with its reason and no metrics, and the "already recorded" lookup. Rows
      are DTOs at the boundary, never Prisma types.
- [x] 4.5 Retry classification — a permanent failure is thrown so BullMQ stops immediately
      rather than spending the attempt budget; everything else keeps its attempts. This is
      the trade-off `0007` names, and it is one line in the wrong place away from being
      wrong.

## 5. Verify it runs

- [x] 5.1 Temporary providers for the three ports, in the branch only: a source that yields
      generated specifications, a runner that returns a deterministic trade list after a
      short delay, and an evaluator that counts it. They exist to exercise the loop and are
      removed in 5.6 — the same move as T07's temporary handler.
- [x] 5.2 A run without a bound is refused; a bounded run starts and returns immediately;
      `scripts/ws-probe.mjs` on the run's topic shows counters moving and a final message
      with the reason.
- [x] 5.3 Two worker processes share one run and no candidate is tested twice; pause stops
      new candidates while one in flight still finishes and is recorded; resume continues
      the same counters; stop ends the run and leaves nothing waiting.
- [x] 5.4 Each bound ends the run for its own reason: the candidate limit, the duration
      limit, and the plateau limit with a runner that stops improving.
- [x] 5.5 A malformed specification fails once, is not retried, and appears as a failed
      experiment carrying its reason; a runner made to throw a transient error is retried
      and then recorded as failed; the failed count matches `status`.
- [x] 5.6 A duplicate is skipped without a backtest, and the same members in a different
      order hash alike. Then remove 5.1's providers and confirm a run with no source
      registered ends immediately with "exhausted" and zero tried.

## 6. Close the change

- [x] 6.1 `pnpm lint`, `pnpm build` and `pnpm decision --check` all pass.
- [x] 6.2 `AGENTS.md` commands — `pnpm worker` beside `pnpm dev`, and Redis named where
      Postgres already is. The README's install and run sections belong to T26.
- [x] 6.3 `docs/decisions/README.md` — drop the two details 0.2 settles and the rounding
      detail 0.3 settles from *Still open*.
- [x] 6.4 `pnpm commit`, then push — the gate wants the record and both amendments in the
      same push as the contracts and module changes.
- [x] 6.5 Move the T19 card and comment on it, naming the provider line T11, T12, T13 and
      T17 each add, so nobody reads the ports as unfinished work of this task. It goes to
      *In Progress* rather than Done: the branch is pushed and unmerged, and T07 moved to
      Done only after its PR landed.
