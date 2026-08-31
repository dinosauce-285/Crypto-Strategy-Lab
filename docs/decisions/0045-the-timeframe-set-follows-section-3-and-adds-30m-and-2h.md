# The timeframe set covers every example in the brief

## Why this

The brief names timeframes three times and every one of them is an illustration.

Section 3 walks a user through swapping each chart — `5m → 1m`, `15m → 30m`, `1h → 2h`,
`4h → 1d` — to make the point that changing one chart does not reload the system. Section 4
lists six under `Ví dụ:` while describing what historical data is for. Section 5 draws the
picker as `[1m] [5m] [15m] [1h] [4h] [1d]`, also under `Ví dụ:`, while saying each chart must
be able to change its own timeframe.

Nowhere does the brief specify the set. Every mention sits behind the word "example", and
each is making a point about something else — hot-swapping, storage, per-chart independence.

That matters because it removes the question this record first tried to answer. There is no
contradiction to adjudicate and no need to decide which section outranks which. Six
satisfies sections 4 and 5 and leaves section 3's example unreachable. Eight satisfies all
three, because the six are a subset of the eight: every picker the brief draws can still be
drawn, and the swap section 3 describes can actually be performed.

So the set is `1m, 5m, 15m, 30m, 1h, 2h, 4h, 1d` — the smallest set that covers every
example the brief gives. Both new values are Binance intervals, and the adapters pass the
timeframe through as the `interval` query parameter unchanged, so nothing has to learn how
long a `30m` candle is. The two places that map every timeframe to a number are
`Record<Timeframe, …>`, so the compiler names them rather than letting one silently miss a
case.

## What else we looked at

**Ship the six and treat section 3 as a contradiction to note in the report** — the reading
this record originally took, and it was wrong twice over. It missed that section 4 also
lists six, so the count was never the 1-1 tie it was argued as. More importantly it treated
section 5's list as a specification when the line above it says `Ví dụ:`. Having decided a
contradiction existed, it then had to declare section 5 wrong about the system — a sentence
that would have to be written into the report and defended out loud, invented entirely to
justify a conflict that was not there. Nothing about eight timeframes contradicts an example
that shows six.

**Add every Binance interval** — `3m` through `1M`, fifteen of them, free at the adapter.
Not free where it counts: each becomes a button in the selector, a row in every
`Record<Timeframe, …>`, and a partition of candle history with its own backfill. A picker
with fifteen options answers "which chart am I looking at" worse than one with eight, and
section 5's instinct to keep the set short is right even where its list is only an example.

**Make the set configurable** — read it from the environment so it stops being a contract.
It moves the choice somewhere nobody reviews and it destroys what makes `Timeframe` worth
having: a union the compiler can check exhaustively. A configurable set is a `string`, and a
`string` is how a chart ends up asking Binance for an interval that does not exist.

## Trade-offs

Eight timeframes is eight partitions of candle history rather than six, each backfilled
independently on first use. Nothing that exists today gets slower; what changes is that two
more can be created, so a user who visits all eight has stored a third more than one who
visits all six — for two timeframes that may never be clicked.

`Timeframe` is a contract both apps import, and widening a union is only safe in one
direction. Everything already persisted stays valid, and the two exhaustive maps are
`Record`s, so the compiler caught them. Anything that had handled all six some other way — a
`switch`, a chain of comparisons — would now have an uncovered case and no error to say so.
None exists today; this paragraph is the warning for the next one.

The picker now shows eight buttons where the brief's example shows six, and somebody will
ask why. The answer is section 3, which is a good answer and still a question that has to be
fielded. A shorter picker is easier to read, and two of these eight exist to satisfy four
lines of an example rather than because anyone asked to trade on a 2-hour candle.
