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

A record is written when a decision is actually made. Nothing is pre-created and
left waiting to be filled in — an empty shell is worse than no file, because it
looks like the thinking happened.

## Still open

Six blocking decisions remain: strategy versioning, the strategy context, what a
dataset is, whether the leaderboard is stored or recomputed, strategy metadata, and
the generator signature.

Two of them now have a first claim on them from elsewhere and should be settled
knowing that. `0006` assumes a strategy declares its warm-up length in metadata,
which presumes the metadata decision goes that way. `0007` stores a version per
member of a candidate, which presumes versioning exists in some form.

Options and trade-offs for each are written out in `../decisions-to-lock.html`, and
`../decision-options.html` adds the cost of every option rather than only of the
rejected ones. Each becomes a record here once settled.

The brief also expects a record covering the realtime transport and one covering
the strategy plugin mechanism. Neither is written yet, because neither decision has
been made yet.
