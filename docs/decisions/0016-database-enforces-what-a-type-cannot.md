# The database mirrors the contracts, and enforces only what a type cannot

## Why this

Every shape in `@csl/contracts` now needs a column to live in, and the translation
is not mechanical. A `Timeframe` is one of six strings; a price is a decimal string;
a timestamp is a number of milliseconds. Postgres has an opinion about each of
those, and taking its opinion everywhere would mean the shared types and the tables
slowly stop describing the same thing.

The rule we settled on is narrow: the tables copy the contracts, and the database
adds a constraint only where a TypeScript type is incapable of holding the
guarantee. A type cannot say *this experiment's dataset exists*, or *this candidate
was tested once*, or *these two trades are not both trade #3*. Those become foreign
keys and unique indexes. A type can perfectly well say *timeframe is one of six
strings* — so the database is left out of it.

Four consequences follow, and they are the substance of this record.

**Closed lists are text columns.** `Timeframe`, `EntryPrice`, `DrawdownMode`,
`StrategyGroup`, the experiment status, the trade side and the sentiment label are
all `String`. A Postgres enum would be a second declaration of a list that already
exists in the contracts package, kept in step by hand — the arrangement `0012`
rejected when it turned down a config file for strategy metadata. Three of the seven
also cannot spell their own values as Prisma identifiers: `1m` starts with a digit,
`signal-close` and `per-candle` carry hyphens. They would need `@map`, which leaves
the client naming a member `m1` while the contract says `'1m'`, so every repository
would carry a translation table in both directions. Enumerating only the four clean
lists would split the schema by a syntax accident rather than by meaning.

**Timestamps are `timestamptz(3)`, and become epoch milliseconds at the repository
boundary.** The contracts use numbers because that is what crosses a socket and a
queue without ceremony. `BigInt` looks like the faithful column, but Prisma hands
back a JavaScript `bigint`, which does not survive `JSON.stringify` and does not
compare against a `number` — so it needs converting too, and adds a serialisation
trap on top. A `timestamptz` converts once in a place that already exists, and in
exchange the database can do range scans, and a person reading the table sees a date
rather than a thirteen-digit integer.

**Prices are `Decimal(38,18)`; ratios are `double`.** The contracts keep prices as
decimal strings precisely so nothing is rounded before it lands, and a float column
would undo that at the last step. Win rate, total return and drawdown are derived
comparison numbers with no such history, so they cost nothing as floats.

**The metrics are columns, not a json blob.** The leaderboard is an `ORDER BY` over
them — `0011` — and ordering by a json field means the database cannot use an index
and the query cannot be typed. They are all nullable, because a failed run has no
metrics at all and a zero would be a lie the leaderboard cannot tell apart from a
strategy that made nothing.

Two smaller things are decided here for the same reason. The `Candle` table has no
`closed` column: only closed candles are stored, and the one still forming lives on
the socket of T07, so a column would exist to always hold the same value. And
`Dataset` carries a unique index over all nine of its columns, because two rows
describing the same window judged by the same rules would split one leaderboard into
two that each look complete.

## What else we looked at

**Prisma enums with `@map`** — the version where the database refuses a bad value
outright, which is the ordinary answer and the one `0002` would seem to argue for.
It buys a guarantee that is already held one layer up, and charges a hand-written
mapping in every repository that touches a timeframe. Worth revisiting if raw SQL
ever writes these columns, because that is the one path where the TypeScript type is
not standing in front of the insert.

**Metrics in the `spec` json, or in a json column of their own** — fewer columns, and
adding Sharpe later would not be a migration. It puts the leaderboard's sort key
inside a blob, which is the one place it must not be.

**A `Leaderboard` table** — section 35 lists it as a sixth data group and this is the
obvious place to create it. `0011` already decided against storing a rank, and this
schema is where that decision either holds or quietly does not.

**Epoch milliseconds as `BigInt`, matching the contracts exactly** — no conceptual
conversion at all, and the column means literally what the type means. Rejected
above on the JavaScript side of the trade rather than the database side.

## Trade-offs

A typo reaches the table. `timeframe: '5mm'` is rejected by TypeScript and by the
validator the contracts package says has to exist, and by nothing else. Anything that
writes through raw SQL — the ranking query of `0011` is the likely candidate — sits
outside both, and there is no third net under it.

Timestamps convert twice on every read and every write, and the conversion is written
by hand in each repository. It is two lines each time, and two lines repeated in eight
places is how a rounding difference eventually appears in one of them.

`@@unique([datasetId, specHash])` means a candidate that failed cannot simply be run
again — the row has to be deleted first. That is correct for a specification naming a
strategy that does not exist, which `0007` calls permanently broken, and wrong for a
run that died because a worker was killed. Whoever writes the retry path in T19 has to
tell those two apart, and the database will not help.

The five backtest rules are columns, so adding a sixth judging rule later is a
migration, and every dataset that already exists predates it with no record of what
its value would have been. `0010` accepted that; this is where it becomes real.

Nothing enforces that `Strategy` is append-only. It is a rule in `0009` and a habit in
the registry's startup code, and a single `update` would erase the only record of what
`v1` was. A trigger could close that, at the cost of logic living in the database
where nobody reviews it.
