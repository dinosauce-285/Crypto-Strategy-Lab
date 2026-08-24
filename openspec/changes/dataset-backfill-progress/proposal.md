## Why

Dataset creation (`POST /datasets`) fetches and stores its entire declared candle
range from Binance synchronously, inside the HTTP request (`0041`). That was a
deliberate, considered trade-off at the time — ADR `0041` explicitly weighed and
rejected queuing this through BullMQ, on the grounds that it was "one bounded,
user-triggered fetch that already has a trivial retry story (recreate the Dataset)."
Two things since have stretched that assumption thin, not just "would be nicer":

- BUG-04 (`docs/bug-ledger.vi.html`) showed the write side wasn't reliable at the
  range sizes users actually request — a 14-day/`1m` dataset is ~20,160 candles, not
  the small, quick fetch `0041` pictured. The read side (Binance) was already
  correctly paginated; only the fix (batching `CandleRepository.upsertMany`) made
  that scale work at all.
- A synchronous 10-20s+ HTTP request has no guard against reverse-proxy/load-balancer
  timeouts, and gives the user nothing but an elapsed-time counter (the simple
  stopgap shipped alongside the BUG-04 fix) — no real sense of how much of the range
  is actually done, and no way to leave the page and come back.

This proposal scopes turning Dataset creation into a background job with real
chunk-level progress, so `0041`'s "trivial, bounded" framing gets replaced with one
that matches what the feature is now actually asked to do.

## Decisions

**Settled** — reuse existing infrastructure rather than invent new mechanisms:
- The BullMQ pattern already used by the search worker
  (`apps/api/src/search/backtest-queue.ts`/`backtest.worker.ts`/`backtest.processor.ts`
  — a hand-rolled wrapper around plain `bullmq`, not `@nestjs/bullmq` decorators) is
  the template for a new `dataset-backfill` queue, hosted in the **same** existing
  worker process (`apps/api/src/search/worker.main.ts` /
  `apps/api/src/search/backtest-worker.module.ts`) rather than a new deployment unit —
  that module already imports `MarketModule`, so `CandleBackfillPort`/
  `ExchangeHistoryPort` are already available there.
- The `ChannelPublisher`/topic-builder convention already used for search-run
  progress (`packages/contracts/src/wire.ts`'s `searchRunTopic`/`MESSAGES`/
  `MessagePayloads`/`ServerMessage`, consumed via `apps/web/src/channel/use-topic.ts`'s
  `useTopic` hook, exactly as `SearchScreen.tsx`/`SearchProgressPanel.tsx` already do)
  is the template for a new `datasetBackfillTopic(jobId)` +
  `MESSAGES.DatasetProgress`. The existing separation of concerns carries over
  unchanged: the worker process never publishes to the browser directly (no
  `RealtimeModule` there); only the API process does, driven by `QueueEvents`
  listeners (mirroring `SearchService`'s `onStarted`/`onFinished`/`onFailed`), now
  also listening for a `progress` event.
- The job's identity is decoupled from the Dataset's identity. `DatasetRepository
  .create()` is an upsert on a unique compound key (pair+timeframe+from+to+rules —
  `apps/api/prisma/schema.prisma:57-58`), with a DB-assigned `cuid()` id — it cannot
  be client-pre-generated the way `runId` is. So `POST /datasets` returns a fresh
  **job id**, not a Dataset; the worker only calls `DatasetRepository.create(...)`
  once every candle in the range is fetched and stored, so a Dataset row still never
  exists in a partial state — this proposal only *extends* `dataset-history`'s
  existing completeness guarantee with progress reporting, it does not weaken it.
- Retries reuse `BacktestQueue`'s existing `defaultJobOptions` shape (bounded
  attempts, exponential backoff) — already safe, since `create()`'s upsert makes a
  retried attempt idempotent by construction.

**To settle** — before implementation starts:
- A new ADR that explicitly revisits and supersedes `0041`'s BullMQ rejection, naming
  the real driver (BUG-04's scale, and the unguarded blocking-request-timeout risk)
  rather than only "the user wants a progress bar." Silently contradicting a settled
  ADR without addressing its reasoning is not acceptable per this repo's own
  convention (see how `dataset-owned-candle-storage` itself had to add a
  `candle-history` delta once it found requirements `0040`/`0041` contradicted).
- The exact `DatasetProgress` payload shape (candidate: `{ jobId, fetched, total,
  done, dataset?, error? }`) and how granular the error payload needs to be for the
  frontend to show something actionable (a bare "fetch failed" vs. distinguishing
  "exchange unreachable" from "rate limited, retrying").
- Whether `POST /datasets` keeps its current synchronous shape for narrow ranges
  (e.g. under some candle-count threshold, complete inline and skip the job/topic
  round-trip entirely) or always goes through the async path regardless of size —
  affects whether `DatasetFormModal` needs to handle two response shapes or always
  the job-id-plus-progress one.

## What Changes

- `POST /datasets` returns `{ jobId }` immediately instead of a `Dataset`, and
  enqueues a `dataset-backfill` job carrying the full creation payload
  (pair/timeframe/from/to/rules).
- A new `dataset-backfill` BullMQ queue + worker, hosted in the existing
  `BacktestWorkerModule`/`worker.main.ts` process. The job fetches the declared range
  chunk-by-chunk (reusing `BinanceRestAdapter.fetchRange`'s existing pagination loop,
  extended with a per-chunk progress callback), calling `job.updateProgress({
  fetched, total })` after each chunk, then calls `DatasetRepository.create(...)`
  once complete and returns the created `Dataset` as the job's result.
- The API process's `QueueEvents` listeners for this queue (mirroring
  `SearchService`'s existing `onStarted`/`onFinished`/`onFailed` pattern, plus a new
  `progress` listener) translate job lifecycle events into `DatasetProgress`
  messages, published via `ChannelPublisher` to `datasetBackfillTopic(jobId)`.
- `DatasetFormModal.tsx`: `handleSubmit` posts, receives `{ jobId }`, subscribes via
  `useTopic(datasetBackfillTopic(jobId), ...)` (same pattern as
  `SearchScreen.tsx:97-104`), renders a real `fetched/total` progress bar in place of
  today's elapsed-time-only spinner, calls `onCreated(dataset)` on a `done: true`
  payload, and shows the error state on a failed one.

## Capabilities

### Modified Capabilities
- `dataset-history`: "Creating a Dataset fetches its own candle range" changes from
  synchronous-completion-before-response to an async job with observable progress —
  the completeness guarantee (no Dataset row exists until every candle in its range
  is fetched and stored) is unchanged, only when/how the caller learns the result
  changes. A new requirement is added for the progress-observation behavior itself.

## Impact

- `apps/api/src/search/`: new `dataset-backfill-queue.ts`, `dataset-backfill.worker.ts`,
  `dataset-backfill.processor.ts` (mirroring the existing `backtest-*` trio);
  `backtest.controller.ts` (`POST /datasets` response shape change);
  `backtest.service.ts`/`backtest-worker.module.ts` (wiring); `search.module.ts`
  (queue registration on the API side, mirroring `BacktestQueue`'s provider entry).
- `apps/api/src/market/binance-rest.adapter.ts`: `fetchRange` gains an optional
  per-chunk progress callback parameter.
- `packages/contracts/src/wire.ts`: new `MESSAGES.DatasetProgress` entry,
  `MessagePayloads` addition, `datasetBackfillTopic(jobId)` builder.
- `apps/web/src/backtest/DatasetFormModal.tsx`: submit flow rewritten around the
  job-id-plus-progress-topic pattern instead of a single awaited `fetch`.
- No change to `packages/contracts/src/dataset.ts` (`Dataset` shape itself is
  unaffected) or to any other Dataset consumer (`DatasetPicker`, `SearchScreen`,
  `BacktestScreen`, `LeaderboardScreen`) — they still only ever see a fully-realized
  `Dataset`, exactly as today.
- A new ADR (number TBD at implementation time) explicitly superseding `0041`'s
  BullMQ-rejection reasoning for this specific case.
