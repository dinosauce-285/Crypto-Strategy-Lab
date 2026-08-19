# A module reaches the browser through the channel's ports

## Why this

`0017` settled what a message looks like and `0003` settled how modules notify each
other, and between them sits a question neither answers: when the market module has a
price tick, how does it actually reach the socket. Three modules after this one — T18,
T20, T21 — will ask the same question, and whatever the first one does is what the other
three copy.

The channel exports two abstractions and nothing else. `ChannelPublisher` takes an
envelope and a topic. `TopicAudience` says that a topic just gained its first subscriber,
or lost its last one, disconnects included. A module that wants to push injects them.
Dependency runs one way — `market` imports `realtime`, and `realtime` imports nobody —
which is the arrangement `BACKEND_CONSTRAINT.md` already describes for cross-module
consumption: an abstract class or token, never a concrete service.

The obvious alternative is to let the channel listen to the bus and translate. It is
fewer files today and it is wrong in a way that compounds: the channel would have to know
that `market.candle.closed` exists, what a `Candle` is, and how a market topic is spelled.
Every later kind of traffic adds another branch inside shared infrastructure — leaderboard
ids, run ids, loop state — and the count of places that change when the system grows is
precisely what section 42 measures. Keeping the vocabulary in the module that owns it
means T18 adds a topic name and no line inside the channel moves.

The audience port is the half that is easy to miss. Without it the market module has no
way to know that anyone is watching, so either it streams every pair forever or someone
teaches the channel what a pair is. With it, upstream connections follow demand and the
channel still does not know what it is counting — it reports a string.

None of this replaces the bus. `market` still emits `MarketPriceUpdated` and
`CandleClosed` on it, because T06's candle store and T09's backfill are modules, not
screens. The rule is about audience: a module talking to a module uses the bus, a module
talking to a browser uses the ports, and the same fact often travels both ways for two
different readers.

## What else we looked at

**The channel subscribes to the bus and translates.** Cheapest today — no ports, no
injection, and the market module stays ignorant of everything. It puts domain vocabulary
inside shared infrastructure, which is the cost above. It also makes an internal bus
payload into the browser's contract by accident, and `0017` names that boundary
explicitly: a socket message is shaped for a screen, an event is shaped for a module.

**New bus events for subscription lifecycle** — the channel emits something like
`channel.topic.subscribed` and interested modules listen. It keeps the two modules
mutually ignorant, which is prettier on a diagram. It widens the nine-event contract T02
owns with events that are not domain facts but UI lifecycle, and every module then
receives every topic event and filters. Two mechanisms would also be doing one job, since
the publish direction still needs a port or the translation problem comes back.

**Each feature module owns its own gateway.** No ports, no cross-module injection, and
every team works alone. It is four transports, four reconnect stories and four things to
explain — the option `0017` exists to prevent, arriving by a different road.

## Trade-offs

A domain module now imports infrastructure, so the arrow points from `market` to
`realtime`. That is the right direction only as long as the channel stays free of domain
types. The day someone adds a `Candle` to a port signature to save a line, the dependency
inverts and the design is gone. Nothing in the build catches it; it is a review rule.

Two ports is more surface than T07 alone needs. T18, T20 and T21 publish but never need
to know who is listening, so `TopicAudience` exists for one consumer, and a port with one
consumer is a generalisation we have not tested.

Publishing from inside each module means there is no single place where everything sent to
the browser passes through. Answering "who sent this message" becomes a search across
modules rather than a log line, and the bus — which does have that property — is no longer
the thing to grep.
