## 0. Decisions

- [x] 0.1 `pnpm decision "The push channel runs on Socket.IO"` — ADR-001. Why a socket
      rather than SSE or polling, and why the library rather than a raw `ws` gateway;
      what it costs (a client dependency, a frame that is not plain WebSocket).
- [x] 0.2 `pnpm decision "A module reaches the browser through the channel's ports"` —
      the channel exports a publisher port and an audience port and stays free of domain
      vocabulary; a module that pushes injects them. What T18, T20 and T21 inherit.

## 1. The wire contract

- [x] 1.1 `packages/contracts/src/wire.ts` — the `0017` envelope: a `ServerMessage` of
      `type` and `payload`, the namespaced type names for a price tick and a closed
      candle, and their payload map.
- [x] 1.2 Topic helpers in the same file: build the price topic of a pair and the candle
      topic of a pair and timeframe, and parse one back. This is the narrowing `0017`
      names in its trade-offs — the client never writes a topic string by hand.
- [x] 1.3 Export from `packages/contracts/src/index.ts`, then `pnpm build:contracts`.

## 2. The channel

- [x] 2.1 Add `@nestjs/websockets`, `@nestjs/platform-socket.io` and `socket.io` to
      apps/api.
- [x] 2.2 `apps/api/src/realtime/realtime.gateway.ts` — handle `subscribe` and
      `unsubscribe` carrying a topic string, and hold the client's topics for the life of
      the connection only. The topic is opaque: no validation, no rewriting.
- [x] 2.3 The gateway's own CORS, from `WEB_ORIGIN` in config. `app.enableCors` in
      `main.ts` covers HTTP only and does not reach the socket server; `setGlobalPrefix`
      does not move its path either, so the path is settled here and written into the
      contracts package beside the topics.
- [x] 2.4 `apps/api/src/realtime/ports/` — an abstract `ChannelPublisher` (publish an
      envelope to a topic) and an abstract `TopicAudience` (a topic gained its first
      subscriber, or lost its last, disconnects included). `realtime.module.ts` exports
      both tokens and nothing else.
- [x] 2.5 Wire the gateway as the implementation of both ports; register the module in
      `app.module.ts`.
- [x] 2.6 `scripts/ws-probe.mjs` — connect, subscribe to a topic given on the command
      line, print every envelope. T18, T20 and T21 get the same tool for free.
- [x] 2.7 Verify it runs: probe subscribes to a topic, a publish from a temporary handler
      arrives; a second probe on the same topic receives it too; after `unsubscribe` the
      first receives nothing while the second still does. Remove the temporary handler.

## 3. The market stream

- [x] 3.1 Lay `apps/api/src/market/` out so T06 adds files rather than edits them: `ports/`
      for the abstractions, adapters named by transport so `binance-rest.adapter.ts` sits
      beside `binance-stream.adapter.ts`, and nothing in the stream path that a candle
      repository or an HTTP controller would have to reopen. One domain is one module, and
      this branch is the one that creates it.
- [x] 3.2 `apps/api/src/market/ports/exchange-stream.port.ts` — the abstract stream a pair
      is watched through. Nothing outside its adapter names Binance.
- [x] 3.3 `apps/api/src/market/binance-stream.adapter.ts` — Node 22's built-in `WebSocket`,
      one socket per pair carrying the trade stream plus a kline stream per watched
      timeframe, added and removed on the live socket as timeframes come and go. Four
      charts on one pair is one connection with four kline streams, not four connections.
      Base URL from `ConfigModule`; add `BINANCE_WS_URL` to `.env.example`.
- [x] 3.4 Normalise inside the adapter: a trade becomes pair, price and observation time;
      a kline becomes a `Candle` with decimal strings, and only when the exchange marks it
      closed. A forming candle is dropped.
- [x] 3.5 `apps/api/src/market/market.service.ts` — subscribe to `TopicAudience`, open one
      upstream connection on the first watcher of a pair, refcount the rest, close it when
      the last leaves. Publish through `ChannelPublisher` and emit `MarketPriceUpdated`
      and `CandleClosed` on the bus for T06's store and T09's backfill.
- [x] 3.6 `market.module.ts` imports the realtime module, registers the adapter against
      the port, and is registered in `app.module.ts`. It exports nothing yet — T06 adds
      what its endpoint needs.
- [x] 3.7 A dropped upstream connection is left as it falls: the topic goes quiet and the
      screen keeps showing what it last had. Reconnecting and backfilling the missed
      candles is T09, and building half of it here would leave a screen that looks live
      while it is not — say so in the record rather than half-solving it.
- [x] 3.8 Verify it runs: probe `market:BTCUSDT:price` and watch ticks arrive; probe
      `market:BTCUSDT:1m` and wait for one candle to close; a second probe on the same
      pair opens no second upstream connection; closing both closes it.

## 4. The live panel

- [x] 4.1 Add `socket.io-client` to apps/web; one module owns the connection, so a second
      screen in T08 does not open a second socket.
- [x] 4.2 Proxy the socket path in `vite.config.ts` with `ws: true`, next to the existing
      `/api` entry. That file's own rule is that the browser only ever talks to the web
      origin, and a socket opened straight at `:3001` would break it.
- [x] 4.3 A hook that subscribes to a topic and unsubscribes on unmount and on change of
      topic. This is what T08 reuses for four charts, so it takes a topic and returns
      messages — it knows nothing about panels.
- [x] 4.4 The panel: pair and timeframe selectors, the last price, and the candles that
      have closed since it connected. No number is computed here — a percentage or a
      change figure would be business logic in React.
- [x] 4.5 All four states, per the UI constraint: connecting, nothing arrived yet, stream
      unreachable with what to do about it, and data. Colours come from tokens in
      `index.css`.
- [x] 4.6 Verify it runs in a browser: prices tick without reloading; a closed candle
      appears; switching timeframe drops the old topic and the price keeps running; with
      the API stopped the error state appears and recovers when it comes back.

## 5. Close the change

- [x] 5.1 `pnpm lint` and `pnpm build` both pass; `pnpm decision --check` passes.
- [x] 5.2 `docs/decisions/README.md` — drop "The shape of realtime messages" from *Still
      open*. `0017` settled it and the section was never updated.
- [x] 5.3 `pnpm commit`, then push — the gate wants the records from group 0 in the same
      push as the contracts and module changes.
- [x] 5.4 Move the T07 Trello card to Done.
