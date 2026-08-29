## Why

T06/T08 gave the realtime screen a chart fed by "the most recent N candles," which is
all it ever needed. Comparing the finished work against Module 1's own requirement doc
(whose own example is a date range, `01/07 → 30/07`) surfaced two gaps neither Trello
card's text caught: `GET /market/candles` has no way to ask for a specific historical
window, and `BinanceRestAdapter` is wired in as a concrete class instead of sitting
behind a port the way the live-stream side already does. Both block the Backtest tab's
historical chart, and the first will also block T12 (a backtest reads a dataset's own
range, not whatever's newest).

## Decisions

**Settled** — [0022](../../../docs/decisions/0022-historical-candles-are-drawn-with-lightweight-charts.md)/[0023](../../../docs/decisions/0023-backfill-is-1000-candles-per-pair-and-timeframe-fetched-lazi.md)
the chart and its backfill already exist; this extends the read side, not the write
side. [0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md)
the ports pattern this mirrors, moved from the channel side to the exchange side.

**To settle** — Two: how a date-range query behaves (what happens when the range isn't
fully backfilled), and whether the historical adapter gets the same port abstraction
the stream adapter already has.

## What Changes

- `GET /market/candles` accepts an optional `from`/`to` (epoch ms) range, alongside the
  existing `limit`-only "most recent N" mode, which stays byte-for-byte unchanged.
- A range request never calls Binance — it reads whatever's in storage for that window,
  possibly partial or empty, same "storage only" invariant the existing endpoint
  already has.
- `BinanceRestAdapter` moves behind a new `ExchangeHistoryPort`, mirroring
  `ExchangeStreamPort`.
- No frontend changes — this is the backend capability the Backtest tab will read from
  later, not the screen itself.

## Capabilities

### New Capabilities
(none)

### Modified Capabilities
- `candle-history`: adds a requirement that a range of candles can be requested by an
  explicit date, alongside the existing "most recent N" requirement.

## Impact

- `apps/api/src/market/ports/exchange-history.port.ts` (new).
- `apps/api/src/market/binance-rest.adapter.ts`, `market.module.ts`,
  `market.service.ts`, `candle.repository.ts`, `market.controller.ts`,
  `dto/get-candles.dto.ts`.
- No `packages/contracts` change — a REST query shape, not a socket message.
- Card: https://trello.com/c/zPtZxMO1/30-historical-candles-date-range-query-swappable-exchange-adapter
  (not one of T01–T29 — found during the T06/T08 gap analysis).
