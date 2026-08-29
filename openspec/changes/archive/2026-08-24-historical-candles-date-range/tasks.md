## 0. Decisions

- [x] 0.1 [0026](../../../docs/decisions/0026-historical-candles-are-queryable-by-an-explicit-date-range.md)
      — the range-query behaviour, and specifically that an uncovered range returns
      partial data rather than triggering an on-demand exchange fetch.
- [x] 0.2 [0027](../../../docs/decisions/0027-the-historical-adapter-sits-behind-exchangehistoryport.md)
      — mirrors ADR 0020, applied to the REST/backfill side.

## 1. ExchangeHistoryPort

- [x] 1.1 `apps/api/src/market/ports/exchange-history.port.ts` — abstract
      `ExchangeHistoryPort` with `fetchKlines(pair, timeframe, limit)`, same signature
      `BinanceRestAdapter` already has.
- [x] 1.2 `BinanceRestAdapter extends ExchangeHistoryPort` (same shape as
      `BinanceStreamAdapter extends ExchangeStreamPort`).
- [x] 1.3 `market.module.ts` registers `{ provide: ExchangeHistoryPort, useClass:
      BinanceRestAdapter }` instead of `BinanceRestAdapter` directly.
- [x] 1.4 `market.service.ts`'s constructor takes `ExchangeHistoryPort`, not the
      concrete adapter; `backfill()`'s call site changes type only, not behaviour.

## 2. The range query

- [x] 2.1 `candle.repository.ts`: `range(pair, timeframe, limit)` becomes `range(pair,
      timeframe, { limit?, from?, to? })`. With `from`/`to`: filter by `openTime`
      between them, ascending, `limit` as an optional safety cap. Without either:
      unchanged from today — most recent `limit`, byte-for-byte.
- [x] 2.2 `market.service.ts`'s `getHistory` gains `from`/`to`, passed straight through.
- [x] 2.3 `market.controller.ts`: `GET /market/candles` accepts optional `from`/`to`
      (epoch ms). Reject one-without-the-other and `from > to`. `limit` stays optional
      and clamped in both modes.
- [x] 2.4 `dto/get-candles.dto.ts`: `GetCandlesQueryDto` gains `from?: number; to?:
      number`.

## 3. Verify

- [x] 3.1 `pnpm --dir apps/api lint`, `exec tsc --noEmit`, `build`.
- [x] 3.2 Live against real Postgres: `limit`-only request unchanged from before
      (regression check — `CandleChart`/`RecentTicks` depend on this exact shape); a
      fully-covered range returns exactly that range, ascending; a range older than the
      earliest stored candle returns partial data, not an error; `from` without `to`
      and `from > to` both 400.
- [ ] 3.3 Open the Realtime tab in a browser — confirm charts and ticks still load
      (this endpoint is what `CandleChart` calls on every mount).

## 4. Close the change

- [x] 4.1 `pnpm decision --check`.
- [x] 4.2 `openspec validate historical-candles-date-range --strict`.
- [x] 4.3 `pnpm commit`, push, open a PR.
- [x] 4.4 Move the Trello card to Done.
