# Realtime ticks carry volume and buy/sell side

## Why this

The realtime screen's ticks panel is meant to show what section 2's realtime example
shows — a trade as it happens — but a bare price repeated every second reads as noise,
not a trade tape. A trade tape is only useful with size (was it a big order or a small
one) and direction (was the market being bought or sold into), which is exactly what
Binance's combined trade stream already carries on every frame: `q` (quantity) and `m`
(whether the buyer was the resting order). We were already parsing this frame in
`binance-stream.adapter.ts` and discarding both fields.

`0017` settled that a socket message is shaped for a screen, not for whatever the
exchange happened to send — so this isn't "pass Binance's fields through," it's " the
screen's contract gains the two fields the screen needs," derived from Binance's frame
inside the adapter the same way price and candles already are. `side` is derived, not
copied: Binance's `m` is `isBuyerMaker`, and a `true` there means the resting order was
a buy, so the trade that matched it was a sell from the taker's side — the adapter does
that translation once, so nothing downstream has to know what `m` means.

## What else we looked at

**A separate `Trade` message alongside `MarketPrice`.** Keeps `MarketPrice` minimal for
consumers that only want the number (there are none today, but there could be), at the
cost of two subscriptions and two handlers everywhere a screen wants both — every
existing consumer of `market:PAIR:price` (the price display, now the ticks panel) wants
the same trade, just projected differently. One message the ticks panel reads three
fields from and the price display reads one field from is the same information, sized
once.

**Compute volume/side in `MarketService` instead of the adapter.** `MarketService` is
exchange-ignorant by design (`ExchangeStreamPort` exists so it never has to parse a
Binance frame) — moving the `isBuyerMaker` translation there would mean teaching the
one exchange-agnostic module what one exchange's flag means, which is the inversion
`0020`'s ports already argue against.

## Trade-offs

`MessagePayloads[MarketPrice]` is bigger now for every consumer, including ones that
only ever wanted the price — the live price display in `Dashboard`'s cells reads `at`
and `price` and now silently receives `volume`/`side` it ignores. Small payload, so this
costs bytes on the wire, not a real budget, but it is the direction this trades away
from a leaner, single-purpose message.

`side` is an inference (matched order's resting side), not a labelled fact Binance
asserts — for the combined trade stream this is the standard, documented reading of
`isBuyerMaker`, but it is still a derived value baked into the wire contract rather than
raw exchange data, which is one more thing a reader has to trust the adapter got right.
