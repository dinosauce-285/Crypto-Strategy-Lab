# One push channel to the browser, addressed by topic

## Why this

A screen must not ask the server the same question over and over, so the server
pushes instead — section 4 says it outright, and section 33 ends with the frontend
receiving an event and the table updating with no reload. That is one channel out
to the browser, and the question is what travels on it.

It looks like a question about prices, because prices are the only thing that
travels on it today. They are not. The same channel later carries
`LeaderboardUpdated` from T18, search progress from T20 and loop state from T21, and
those belong to three other people. A wire format designed for candles alone fits
none of them, so each grows a channel of its own and the system ends with four
mechanisms doing one job — the shape section 41 is written to expose, arrived at by
neglect rather than by a bad decision.

So the format is settled now, while only one of the four exists, and it settles four
things.

**One envelope.** Every message is a `type` and a `payload`, and `type` is a
namespaced string. Nothing else is in the frame. A reader of any message knows where
to look before knowing what kind of message it is.

**Addressed by a topic string.** A client subscribes to `market:BTCUSDT:5m`,
`leaderboard:<datasetId>`, `search:<runId>` or `loop`. Those four filter by four
entirely different keys — a pair and a timeframe, a dataset, a run, and nothing at
all — and a string is the one shape that holds all four without the server being
taught each of them. The server matches topics; it does not interpret them. Adding a
fifth kind of traffic is a naming convention, not an edit to the delivery code, which
is the property section 42 measures.

Unsubscribing is per topic, so T08's requirement falls out with nothing extra: a
chart changing its timeframe drops one topic and the other three charts do not move.

**What a message carries depends on who computes the number.** If the server
recomputes it on read, the message says only that it changed and the client asks
again. Otherwise the message carries the value.

Today the leaderboard is the only thing on the notification side, and it is there for
a specific reason: `0011` computes the board on every read, so a board attached to a
message was computed at send time and can already be behind by the time it arrives —
and a stale ranking looks exactly like a fresh one. Prices are on the other side
because a tick arrives several times a second across four charts, and turning each
into an HTTP round trip is absurd.

Both halves are forced, so the decision is really the rule itself. Written down, T18,
T20 and T21 each know which side they are on. Left unwritten, three people guess, and
the one who guesses wrong ships a screen that displays an old number convincingly.

**No snapshot on connect.** Initial state comes over HTTP; the channel carries only
what changed afterwards. T06 already needs a candle endpoint to draw the first chart,
so the alternative would have each kind of traffic define a snapshot of its own, three
of which duplicate an endpoint that has to exist anyway.

Two boundaries hold this in place. This is **not** the event bus of `0003`: T02 owns
the nine bus payloads, which are shaped for a module, and this record owns the wire
format, which is shaped for a screen. Piping one into the other would make a module's
internal event a public contract with the browser. And `0004` already drew the other
line — anything whose loss breaks work goes through the queue, anything that only
updates a display goes here, which is why nothing on this channel is retried.

The contract lives in `@csl/contracts` because three modules besides this one will
import it, and a wire format that two sides declare separately is a wire format that
eventually disagrees with itself.

## What else we looked at

**A typed subscription — `{ channel, filter }`** — the version the compiler can check,
and the one a TypeScript codebase reaches for first. Each kind of traffic needs its own
filter shape, so the server grows a matching branch per kind and adding a fifth means
editing it. That is exactly the cost section 42 asks us to measure, paid in the one
place this record exists to keep cheap. The type safety it buys is real but narrow: it
checks the filter's shape, not that the topic exists.

**The socket library's own rooms or namespaces** — nothing to design, and the library
has already solved fan-out. It puts the addressing scheme inside a dependency rather
than in the contracts package, so `ADR-001` would end up defending a library choice
instead of a design, and swapping the library later would change the contract every
client is written against.

**Every message carries its data** — the client never has to ask twice, and the code is
uniform. It breaks `0011` at the only place that matters: the board is computed on read,
so a board that travels is already behind, and nothing about a wrong ranking looks
wrong.

**Every message is a bare notification, client refetches everything** — one rule, no
judgement calls, the smallest payloads. A price tick becomes an HTTP round trip, times
four charts, several times a second.

**A snapshot pushed on subscribe** — one step for the client instead of two, and no
window between reading and subscribing. Each kind of traffic must then define what its
snapshot is, and three of the four answers already exist as HTTP endpoints.

**A separate channel per kind of traffic** — worth naming because it is what happens by
default when nobody decides. Four transports, four reconnect stories, four things to
explain in the architecture document.

## Trade-offs

A topic is a string, so a typo is not a compile error. Subscribing to
`market:BTCUSDT:5min` receives nothing, and receiving nothing looks the same as a quiet
market. A builder function in the contracts package narrows this on the client side and
does nothing about a server publishing to a misspelled topic. This is the price of the
one mechanism that holds four scoping keys, and it is the strongest argument the typed
alternative had.

Two rules now govern what a payload holds, and the line between them is a judgement
about who computes a number. It is clear for the four kinds of traffic we have. A fifth
that sits near the boundary gets decided by whoever writes it, and nothing catches the
wrong call.

No snapshot leaves a gap between the HTTP read and the subscription taking effect. A
change landing in that window is missed. For prices the next tick repairs it; for
anything shaped like an event it does not, and this record does not fix that — it
narrows the window and accepts it.

Nothing on this channel is delivered reliably, by design. A screen that misses a
`leaderboard.changed` stays stale until something else moves it. That is the correct
trade for a display channel and it is still a way for a user to see an old number.

Because the contract sits in `@csl/contracts`, changing the envelope later breaks the
build in three modules at once. That is what the package is for, and it is also what it
costs.
