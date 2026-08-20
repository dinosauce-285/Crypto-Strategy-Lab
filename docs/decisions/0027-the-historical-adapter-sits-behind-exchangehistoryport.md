# The historical adapter sits behind ExchangeHistoryPort

## Why this

`market.service.ts` already depends on `ExchangeStreamPort` for the live side —
`0020`'s whole argument was that nothing outside an adapter should know Binance
exists. T06 built the REST/backfill side in the same file, in the same module, and
wired `BinanceRestAdapter` straight into `MarketService` as a concrete class instead.
The comment on `ExchangeStreamPort` itself ("behind this, nothing knows which exchange
the data came from") was never true for the historical half — this makes it true.
Module 1 states the requirement directly, for exchanges generally, not just the live
one: swapping in `OKXAdapter` or `BybitAdapter` should mean adding a class and a module
registration line, not editing `MarketService`.

## What else we looked at

**Leave it concrete — one exchange exists today.** The obvious minimal option, and
what T06 actually shipped. Rejected on its own inconsistency: the stream side made the
opposite call for the identical reason, in the identical file, and a reader has no way
to tell from the code why one exchange call is behind a port and the other is not.

**Merge `ExchangeHistoryPort` into `ExchangeStreamPort`** as one wider exchange
interface instead of two. Fewer types, but a stream connection and a bounded REST fetch
are different shapes (one hands back a long-lived handle with `addTimeframe`/`close`,
the other returns once) — forcing them into one interface would mean either method
being optional on implementations that do not need it, which is the sort of interface
`0020`'s narrow, single-purpose ports were chosen to avoid.

## Trade-offs

One more file and one more injection token for a single implementation, same cost
`0020` already paid on the stream side and judged worth it — the point is not today's
second exchange, which does not exist, but that `MarketService` no longer has a reason
to change when one eventually does.
