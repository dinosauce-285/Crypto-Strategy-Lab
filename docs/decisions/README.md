# Decision records

One file per architectural decision. Each one answers three things and nothing
more: **why we chose this**, **what else we looked at and why it lost**, and
**what we give up in return**.

Keep them short and keep them about reasoning. No status fields, no owner, no
dates, no task IDs, no process ceremony — none of that is what gets read, and all
of it rots. If a decision is later replaced, write a new file saying so.

Start from [`0000-template.md`](0000-template.md).

## When to write one

A change needs a record when it does any of these:

- introduces or changes a shared type, interface or event contract
- changes the database schema
- changes how modules communicate (direct call, event, queue)
- adds a dependency, service or piece of infrastructure
- changes backtest or scoring rules — entry price, fees, drawdown maths
- settles one of the open decisions in `../decisions-to-lock.html`

Write it as part of the change, not afterwards. The reasoning is only accurate
while you still hold it.

## Records

- [0001](0001-typescript-nest-react.md) — TypeScript on both ends: NestJS backend, React + Vite frontend
- [0002](0002-postgres-prisma.md) — PostgreSQL for all data, accessed through Prisma
- [0003](0003-in-process-event-bus.md) — modules talk through an in-process event bus
- [0004](0004-bullmq-for-backtests.md) — backtests run through BullMQ on Redis
- [0005](0005-sentiment-via-groq.md) — sentiment classification calls the Groq API, behind a provider interface
- [0006](0006-signal-carries-strength.md) — a signal carries a direction and a strength
- [0007](0007-candidate-as-spec.md) — a candidate strategy travels as data, built into an object only to run
- [0008](0008-strategy-declares-its-data.md) — a strategy declares the data it needs, and the engine prepares it
- [0009](0009-strategy-versioning.md) — a strategy is stamped twice: a hand-set version for its code, a hash for its parameters
- [0010](0010-dataset-carries-the-backtest-rules.md) — a dataset is a record with its own id, and the backtest rules are part of it
- [0011](0011-leaderboard-is-recomputed.md) — the leaderboard is computed from experiments on every read
- [0012](0012-strategy-metadata.md) — every strategy describes itself, and three parts of the system read that description
- [0013](0013-generator-receives-history.md) — the generator is handed the history of previous rounds
- [0014](0014-weighted-merge-only.md) — signals are combined by weighted score only
- [0015](0015-unknowable-numbers-are-searchable.md) — a number nobody can argue is put in the specification and answered by the leaderboard
- [0016](0016-database-enforces-what-a-type-cannot.md) — the tables mirror the contracts, and Postgres constrains only what a type cannot
- [0017](0017-one-push-channel-addressed-by-topic.md) — the browser gets one push channel, addressed by topic, carrying only what changed

A record is written when a decision is actually made. Nothing is pre-created and
left waiting to be filled in — an empty shell is worse than no file, because it
looks like the thinking happened.

## Still open

All eleven of `../decisions-to-lock.html` are settled, and so is the merge rule that
sat outside the list. What remains is below.

**The five backtest rules** — entry price, fees, warm-up, summed or compounded, and
where drawdown is measured. `0010` decided these belong inside a dataset; their values
are still a team decision and have to be made before the first dataset row exists,
because changing one afterwards means a new dataset and an empty leaderboard. This is
the one that blocks code: T12 cannot run without them.

**The overall score formula** — how return, win rate and drawdown are weighted into
one number, and whether a strategy with three winning trades outranks one with eighty.
Section 21 requires it to be written out, so it is marked, but it blocks nobody:
`0011` recomputes the leaderboard, so the formula can change without touching stored
data.

**The shape of realtime messages** — one channel carries prices, leaderboard changes,
search progress and run state, and those belong to different people. Built narrowly for
prices, the other three each grow a channel of their own. The brief expects a record on
the transport; this is the same decision.

**Who writes which record (T28)** — the Trello board has no card for it, and it is
marked directly.

Three details inside settled records are still open, and each belongs in the record it
affects rather than in a new one: how many decimal places a float is rounded to before
hashing (`0009`); which end of the queue runs the specification validator (`0007`);
and whether a malformed specification is written as a failed experiment or dropped —
section 32.7 asks how many jobs failed, and a silent drop cannot be counted.

The brief also expects a record covering the strategy plugin mechanism. `0001` names
the registry as a Nest provider and `0012` gives it what to read, but section 12 asks
the question directly and deserves its own answer.
