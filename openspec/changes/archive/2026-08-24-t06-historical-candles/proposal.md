## Why

T19's search loop backtests 10,000 candidates; reading each one live from Binance hits
the exchange's rate limit, and Iron Rule 7 requires that re-running an old Experiment
produce an identical result — a live read can't guarantee that, a stored one can. Slice 1
also doesn't close until a chart is on screen: T07 delivers live candles, but nothing
before this shows what already happened.

## Decisions

**Settled** — [0002](../../../docs/decisions/0002-postgres-prisma.md) storage is
Postgres through Prisma; the `Candle` table already exists (`schema.prisma`), this change
only reads and writes it.
[0016](../../../docs/decisions/0016-database-enforces-what-a-type-cannot.md) the table
mirrors the `Candle` contract and Postgres enforces only what the type cannot — this
change's repository follows the same shape, no new constraint.
[0017](../../../docs/decisions/0017-one-push-channel-addressed-by-topic.md) and
[0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md) — the
push channel and its ports already exist from T07; this change adds a listener on
`CandleClosed`, it does not open a new transport.

**To settle** — the charting library, since `apps/web/docs/UI_CONSTRAINT.md` fixes
whatever is picked here as the only one for the whole app: new record. How much history
to backfill (which pairs, which timeframes, how far back) so T19's dataset holds still
per Iron Rule 7: new record.

## What Changes

- Add a Binance REST adapter (`binance-rest.adapter.ts`) alongside the existing stream
  adapter, fetching historical klines and normalising them the same way.
- Add a `candle.repository.ts` in `apps/api/src/market/` — the only place that touches
  `PrismaService` for candles. It subscribes to the `CandleClosed` event T07 already
  emits and upserts it, and it backfills a pair/timeframe on first watch via the REST
  adapter.
- Add `market.controller.ts` exposing a range-read endpoint (`GET /market/candles`)
  returning DTOs, not Prisma rows.
- Add a candlestick chart component in `apps/web/src/market/`, fed by the REST endpoint
  on load and kept live by subscribing to the existing `marketCandleTopic` (same
  `useTopic` hook `MarketPanel.tsx` already uses) — no polling.
- Add the chosen charting library as a new frontend dependency.

## Capabilities

### New Capabilities
- `candle-history`: Binance backfill on first watch, persistent storage of closed
  candles, a range-read endpoint, and a candlestick chart that shows that history and
  keeps updating live — the full path from exchange to screen, the same shape T07 used
  for the live price/candle path.

### Modified Capabilities
(none — `market-stream`'s existing requirements are unchanged; this change adds a new
consumer of the `CandleClosed` event it already publishes)

## Impact

- `apps/api/src/market/`: new adapter, repository, controller, DTOs; `market.module.ts`
  now exports what the controller needs (it currently exports nothing).
- `apps/web/src/market/`: new chart component and screen; `apps/web/package.json` gains
  the charting library.
- No Prisma migration expected — the `Candle` table already has the columns this needs;
  revisit only if the chosen backfill range needs an index Prisma doesn't already give it
  on the `(pair, timeframe, openTime)` primary key.
- Task: **T06**, Trello card:
  https://trello.com/c/yVqtL7Xq/6-t06-historical-candles-full-path
