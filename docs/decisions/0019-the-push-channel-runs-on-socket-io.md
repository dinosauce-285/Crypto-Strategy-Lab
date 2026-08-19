# The push channel runs on Socket.IO

## Why this

Section 4 says the frontend must stop asking for the price over and over, and section 45
§4 asks the question directly as `ADR-001` — why a socket. `0017` answered what travels
on that channel and how it is addressed, and deliberately did not name a technology. This
is that half.

Four things have to be true of whatever carries it. The server has to be able to speak
first, because the whole point is that the browser stops asking. The client has to be
able to speak back, because `0017` addresses by topic and a subscription is the client
telling the server which topics it wants — and unsubscribing is T08's requirement, not a
nicety. One connection has to carry all four kinds of traffic, because `0017` refused to
grow a transport per kind. And it has to survive a laptop lid closing, because a demo in
section 46 is a screen someone leaves open.

Socket.IO gives the last two without us writing them. Reconnection with backoff is in the
client; the server side is a Nest gateway with `@nestjs/platform-socket.io`, so the
module boundary the rest of the system uses applies here too. Rooms turn out to be
exactly the data structure topic matching needs — a set of sockets per string — so the
matching in `0017` is a library call rather than a `Map` we maintain.

A message also arrives under an event named for its topic rather than one generic event
name, so a client holding four topics is woken by the one that moved instead of filtering
four streams by hand — which is what T08's four charts on one pair would otherwise do.

That last point needs care, because `0017` explicitly rejected "the socket library's own
rooms or namespaces". It rejected them as the *contract*: the client would name a room
through a library API and the addressing scheme would live inside a dependency. Here the
client sends a topic string that `@csl/contracts` builds, and the server happens to
implement matching with rooms. Swapping the library changes an implementation detail and
no client code. The line is which side of the wire the scheme is written on.

## What else we looked at

**A raw WebSocket gateway** — `@nestjs/platform-ws` on the server, the browser's built-in
`WebSocket` on the client. It is the most literal answer to "why WebSocket", it adds
nothing to the frontend bundle, and the frame on the wire is something a person can read
in devtools. It loses on the three things we would then own: reconnection with backoff,
heartbeats to notice a connection that is open but dead, and the topic-to-socket table.
None of the three is hard and all three are already written, tested and boring in the
library. Writing them ourselves would be effort spent where nothing is marked — section
42 measures how many places change when the system grows, and a hand-rolled reconnect
does not move that number.

**Server-Sent Events** — one-way, plain HTTP, no library on either side, and it survives
proxies that mangle upgrades. It breaks on the client speaking back: subscribing would
become a separate HTTP call carrying a connection id, so the protocol is two mechanisms
instead of one, and the id has to be correlated. Then HTTP/1.1 caps a browser at six
connections per host, and T08 puts four charts on one screen alongside ordinary API
calls.

**Polling on a timer** — no transport decision at all, works everywhere, trivially
debuggable. It is the thing section 4 names and forbids, and at four charts times several
ticks a second it is absurd on its own terms.

## Trade-offs

The frame on the wire is Socket.IO's, not plain WebSocket. Nothing can read this channel
without the matching client — `curl` cannot, and `scripts/ws-probe.mjs` has to pull in
`socket.io-client` rather than being ten lines against a built-in. A teammate debugging in
devtools sees the library's framing rather than our envelope.

Two dependencies enter the shared contract, one per app, and their majors move together.
A Socket.IO major changes the wire, so server and browser cannot be upgraded on different
days.

The library's own concepts are now within reach of anyone writing the next feature —
namespaces, acknowledgements, per-event handlers. Each of them is a way to address a
message that is not a topic string, which is what `0017` decided against, and nothing in
the build stops someone from reaching for one.

Automatic reconnection hides an event that matters. `0017` says subscriptions do not
survive a connection, so a client that silently reconnects is subscribed to nothing while
looking perfectly connected. The screen keeps its last value and stays wrong until
something resubscribes. We inherit a reconnect we did not write, and with it the
obligation to remember what it does not restore.
