## 0. Decisions

- [ ] 0.1 Write the ADR superseding `0041`'s BullMQ rejection for Dataset-creation
      candle backfill, naming BUG-04 and the unguarded blocking-request-timeout risk
      as the driver (see proposal's "To settle").
- [ ] 0.2 Settle the exact `DatasetProgress` payload shape and error granularity.
- [ ] 0.3 Settle whether narrow ranges skip the job/topic round-trip and complete
      inline, or every creation always goes through the async path.

## 1. `dataset-backfill` queue + worker

- [ ] 1.1 New `apps/api/src/search/dataset-backfill-queue.ts` — mirror
      `backtest-queue.ts`'s `Queue`/connection/`defaultJobOptions` shape, new queue
      name (e.g. `dataset-backfill`), reuse `createRedis`.
- [ ] 1.2 New `apps/api/src/search/dataset-backfill.worker.ts` — mirror
      `backtest.worker.ts`'s `Worker` wrapper (`OnModuleInit`/`OnModuleDestroy`),
      hosted in the existing `backtest-worker.module.ts`/`worker.main.ts` process.
- [ ] 1.3 New `apps/api/src/search/dataset-backfill.processor.ts` — `process(job)`
      calls `ExchangeHistoryPort.fetchRange`/`BinanceRestAdapter.fetchRange` with the
      new per-chunk progress callback wired to `job.updateProgress(...)`, then
      `DatasetRepository.create(...)` once complete; returns the created `Dataset`.
      Mirror `backtest.processor.ts`'s permanent-vs-retryable error split
      (`UnrecoverableError` for non-retryable failures).
- [ ] 1.4 `binance-rest.adapter.ts` — extend `fetchRange` with an optional
      `onChunk?: (fetched: number, total: number) => void` parameter, called after
      each paginated chunk.

## 2. Wire the queue into the API process

- [ ] 2.1 `search.module.ts` — register the new queue provider (mirroring
      `BacktestQueue`'s existing entry).
- [ ] 2.2 `backtest.controller.ts` — `POST /datasets` enqueues the job and returns
      `{ jobId }` instead of awaiting `BacktestService.createDataset`.
- [ ] 2.3 `backtest.service.ts` — `runSingle`'s inline-create branch keeps calling
      the existing synchronous `createDatasetWithHistory` unchanged (that path runs a
      backtest in the same request right after creation and cannot go async) — only
      the standalone `POST /datasets` path changes.
- [ ] 2.4 New `QueueEvents` listeners for the `dataset-backfill` queue (mirroring
      `SearchService`'s `onStarted`/`onFinished`/`onFailed`, plus a new `progress`
      listener) — translate each into a `DatasetProgress` message via
      `ChannelPublisher.publish(datasetBackfillTopic(jobId), ...)`.

## 3. Contracts

- [ ] 3.1 `packages/contracts/src/wire.ts` — add `MESSAGES.DatasetProgress`, its
      `MessagePayloads` entry, and `datasetBackfillTopic(jobId): string`.

## 4. Frontend

- [ ] 4.1 `DatasetFormModal.tsx` — `handleSubmit` posts, receives `{ jobId }`,
      subscribes via `useTopic(datasetBackfillTopic(jobId), ...)` (pattern from
      `SearchScreen.tsx:97-104`); render a real progress bar (`fetched`/`total`) in
      place of the current elapsed-time-only spinner; call `onCreated(dataset)` on
      `done: true`, show the error state on a failed payload.

## 5. Verify

- [ ] 5.1 `pnpm --dir apps/api build`, `test`, `lint` clean.
- [ ] 5.2 `pnpm --dir apps/web build`, `lint` clean.
- [ ] 5.3 Live: create a wide-range Dataset (the BUG-04 repro shape) through the
      modal — confirm the progress bar advances with real fetched/total counts, not
      just elapsed time, and the modal closes with a usable Dataset once done.
- [ ] 5.4 Live: force a mid-fetch failure (e.g. an unreachable exchange host) —
      confirm the modal shows a real error state instead of hanging or silently
      retrying forever, and confirm no partial Dataset row is left in Postgres.
- [ ] 5.5 Confirm `runSingle`'s inline-create path (single-run backtest with no
      pre-existing dataset) is unaffected — still synchronous, unchanged behavior.

## 6. Close the change

- [ ] 6.1 `pnpm decision --check`.
- [ ] 6.2 `openspec validate dataset-backfill-progress --strict`.
- [ ] 6.3 `pnpm commit`, push, open a PR.
