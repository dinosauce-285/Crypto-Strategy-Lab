# Tasks

- [x] Review the existing Binance adapter, market-data service, candle event contract, WebSocket gateway, and nested backend constraints; identify the current cursor/finality behavior.
- [x] Add ADR for server-owned reconnect, cursor semantics, backfill source, deduplication, and bounded retry/backoff, following `docs/decisions/0000-template.md` and the project's three-question format.
- [x] Define or extend the exchange-adapter interfaces for reconnectable live candles and bounded historical candle ranges; update shared contracts only if the existing event/error contract cannot represent recovery state.
- [x] Implement a bounded reconnect state machine in the market-data service with configurable backoff, jitter, retry ceiling, and explicit failed state.
- [x] Implement per-stream closed-candle cursor tracking and a bounded live buffer across reconnect/backfill transitions.
- [x] Implement gap backfill, pagination/chunking for exchange limits, identity-based deduplication, and chronological merge before publication.
- [x] Preserve the existing server-pushed candle path so recovered candles reach WebSocket clients without frontend polling or business logic.
- [x] Add deterministic tests for recovery, overlap deduplication, ordering, pagination, historical-query failure, and terminal failure.
- [x] Add or update the UI transport-level test to prove candles continue after a recovered stream; do not add recovery logic to React.
- [x] Run `pnpm lint` and `pnpm build`, then inspect `git status` to ensure no plaintext env files, private keys, credentials, or local harness files are included.
