# PostgreSQL for all data, accessed through Prisma

## Why this

Five of the six data groups the brief lists are ordinary relational data with real
relationships: an experiment points at a strategy version and a dataset, trades
belong to an experiment, news attaches to a coin. Section 36 demands that an old
experiment always knows exactly which strategy version produced it — a foreign key
makes the database enforce that, where a document store would leave it as a
convention someone eventually forgets.

Ranking is the other reason. If the leaderboard is recomputed from experiment
results rather than stored, Top-K is one query with a grouping and a window
function. That is a few lines written once, against an aggregation pipeline that
has to be debugged.

The one genuinely schemaless thing we have is the candidate specification and the
per-strategy parameter sets, which differ by strategy type. A `jsonb` column covers
that inside the relational model, so flexibility exists exactly where it is needed
without introducing a second database to hold one field.

Candle volume is smaller than it feels — roughly 350,000 rows for one pair across
six timeframes and six months. An index on pair, timeframe and open time is
sufficient, so a dedicated time-series store would be solving a problem we do not
have, and section 38 asks what architectural problem each added technology solves.

Prisma because it generates the TypeScript types from the schema, so those types
flow straight into the shared contracts package. Changing a column without changing
the code becomes a compile error — the same argument that made one language across
both ends worth it. Migrations are versioned files in git, which extends section
36's reproducibility to the schema itself, and the schema file is readable enough to
go into the architecture document instead of being redrawn and left to drift.

## What else we looked at

**SQLite** — no service to run, which is genuinely attractive early on. It fails at
one specific point: it locks the whole database on write, so the moment several
backtest workers write results in parallel it serialises. That happens in the
search slice, meaning we would migrate after real data exists, which is the worst
time to do it.

**MySQL** — would work. Postgres wins on more mature `jsonb` and on window
functions for ranking, but the gap is small; if the team already had MySQL running
it would not be worth switching for.

**MongoDB** — gives up foreign keys, and with them the cheapest answer to section
36. The schema flexibility it offers is real but only needed in one column, which
`jsonb` already covers.

**TimescaleDB or InfluxDB** — right answer at a scale we will not reach, and a
technology we would have to justify against section 38 without a driver to point at.

**TypeORM instead of Prisma** — integrates more naturally with Nest's dependency
injection, since entities and repositories are injectable in the usual way. Its
type safety is looser and its migrations are fiddlier. The trade is integration
against types, and we take types because contracts between modules are the thing
being marked.

**Drizzle instead of Prisma** — excellent types, closer to raw SQL, lighter. Loses
on the volume of examples and documentation, which is a real cost for a student
team hitting an unfamiliar tool under deadline.

## Trade-offs

Prisma is weak at complex and dynamic SQL. The Top-K ranking query is likely to
need raw SQL, which Prisma supports but which sits outside its type safety — the
one place we lose the guarantee we chose it for. If the system turns out to be full
of queries like that, this is the decision to revisit.

Postgres is a service, not a file. Every teammate and every demo machine needs it
running, so setup instructions and the demo checklist carry more weight than they
would with an embedded database. That is the price of surviving parallel workers.
