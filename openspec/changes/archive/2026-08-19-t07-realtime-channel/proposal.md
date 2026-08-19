## Why

Section 4 forbids the browser asking for the price over and over, and section 33 steps
8-9 end with a screen that moves on its own with no reload. Nothing in the repo can do
that yet: there is no socket, no exchange stream, no market module. `0017` settled what
travels on that channel while it was still cheap to settle; this change builds the
channel it describes.

It is built once, now, because three other people land on it later —
`LeaderboardUpdated` in T18, search progress in T20, loop state in T21. Built narrowly
for candles, each of those grows a channel of its own, which is the shape section 41 is
written to expose.

T07 · [Realtime candles - full path](https://trello.com/c/Moo6ZGTe/7-t07-realtime-candles-full-path).
Brief: section 4, section 33 steps 8-9, section 34, section 32.3, section 45 §4 `ADR-001`.

## Decisions

**Settled**

- [0017](../../../docs/decisions/0017-one-push-channel-addressed-by-topic.md) — the wire
  format: one `type` + `payload` envelope, addressing by topic string, a payload carries
  the value unless the server recomputes it on read, and no snapshot on connect. This
  change implements it and does not reopen any of the four.
- [0003](../../../docs/decisions/0003-in-process-event-bus.md) — the in-process bus is
  how modules notify each other. It is not this channel: the market module emits bus
  events and never learns that a browser exists.
- [0004](../../../docs/decisions/0004-bullmq-for-backtests.md) — anything whose loss
  breaks work goes through the queue. A display update does not, so nothing here is
  retried or replayed.
- [0001](../../../docs/decisions/0001-typescript-nest-react.md) — module boundaries are
  Nest modules, so "the gateway knows nothing about markets" is enforced by wiring
  rather than by review.

**To settle** — two, both written before the code that assumes them:

- **Which technology carries the channel.** `0017` designed the envelope and the
  addressing without naming a transport, and section 45 §4 asks `ADR-001` "why WebSocket"
  directly. The choice is Socket.IO behind a Nest gateway, against a raw `ws` gateway and
  against SSE. Task 0.1.
- **How a module reaches the browser.** `0017` drew the line between the bus and the wire
  but not the wiring: a module that wants to push injects the channel's publisher port,
  and the channel never learns what a market is. T18, T20 and T21 each repeat whatever
  this change does, so it is worth one page now. Task 0.2.

## What Changes

- `@csl/contracts` gains the wire contract from `0017`: the `ServerMessage` envelope, the
  message type names, and a builder and parser for the `market:<pair>:<timeframe>` topic.
  Both sides import one declaration of it.
- **New `realtime` module in apps/api** — a Socket.IO gateway that takes `subscribe` and
  `unsubscribe` for a topic string, matches topics without interpreting them, and exports
  two abstract ports: one to publish an envelope to a topic, one to hear that a topic
  gained its first subscriber or lost its last. It holds no market vocabulary at all, so
  T18, T20 and T21 add traffic by naming a topic rather than by editing it.
- **New `market` module in apps/api** — a Binance stream behind a port, normalising into
  the shared `Candle` and price shapes. It injects the two realtime ports: the audience
  port tells it when someone starts watching a pair, and the publisher port is how a tick
  reaches the browser. Dependency runs one way, market → realtime, and the reverse
  direction does not exist.
  This change creates the module and shapes it for T06 to extend: the wiring, a `ports/`
  folder, and adapters named for their transport so `binance-rest.adapter.ts` and the
  candle repository land beside `binance-stream.adapter.ts` as new files rather than as
  edits. One domain is one module, and this is the branch that creates it.
- Both events also go on the in-process bus (`MarketPriceUpdated`, `CandleClosed`, already
  in `@csl/contracts` from T02) so T06's candle store and T09's backfill can subscribe
  without this module learning about them.
- **New live panel in apps/web** — pick a pair and a timeframe, watch the last trade
  price and closed candles arrive, all four states. It is not a candlestick chart: T06
  owns the chart and its library, and T08 plugs the same subscription hook into it.
- Candles arriving on the stream are **not** written to the database. T06 owns the
  Candles table and the history endpoint; `CandleClosed` is on the bus for its store to
  subscribe to when it lands, and T09 covers the gap a dropped connection leaves.

## Capabilities

### New Capabilities

- `realtime-channel`: how a browser subscribes to a topic, what an arriving message looks
  like, and what the channel does and does not guarantee.
- `market-stream`: live prices and closed candles for a pair and timeframe, from the
  exchange to the screen watching them.

### Modified Capabilities

None — `openspec/specs/` is empty, so both capabilities above are new.

## Impact

- `packages/contracts/src/` — a new wire module, exported from the index. Rebuilt before
  either app compiles.
- `apps/api/src/realtime/`, `apps/api/src/market/`, and `app.module.ts`.
- `apps/web/src/` — the panel, a subscription hook, and tokens in `index.css`.
- Dependencies: `@nestjs/websockets`, `@nestjs/platform-socket.io`, `socket.io` in the
  API, `socket.io-client` in the web app. The upstream Binance connection uses Node 22's
  built-in `WebSocket`, so it adds nothing.
- No database change, no migration.
- The pre-push decision gate fires on both the contracts change and the new modules;
  `ADR-001` is in the same push.
- Downstream: T08 reuses the hook, T09 adds upstream reconnection and backfill, and
  T18/T20/T21 each add a topic without touching delivery code.
