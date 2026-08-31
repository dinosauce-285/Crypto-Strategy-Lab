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

`pnpm decision "<the decision, written as a choice>"` starts one: it takes the next
number, writes the three headings and adds the line below. `pnpm decision --check`,
which runs on commit, refuses a record with an empty section or one missing from the
list. Inside an OpenSpec change the record is group 0 of `tasks.md`, ticked before the
code that assumes it.

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
- [0018](0018-features-planned-in-openspec.md) — features are planned in OpenSpec, and the reasoning still lives here
- [0019](0019-the-push-channel-runs-on-socket-io.md) — the push channel runs on Socket.IO
- [0020](0020-module-reaches-the-browser-through-ports.md) — a module reaches the browser through the channel's ports, not through the bus
- [0021](0021-a-search-run-declares-its-bound-before-it-starts.md) — a search run declares its bound before it starts
- [0022](0022-historical-candles-are-drawn-with-lightweight-charts.md) — candlestick chart library
- [0023](0023-backfill-is-1000-candles-per-pair-and-timeframe-fetched-lazi.md) — historical backfill depth and scope
- [0024](0024-realtime-ticks-carry-volume-and-buy-sell-side.md) — recent-ticks panel data
- [0025](0025-tab-navigation-uses-react-router.md) — URL-routed Realtime/Backtest tabs
- [0026](0026-historical-candles-are-queryable-by-an-explicit-date-range.md) — date-range read, storage only
- [0027](0027-the-historical-adapter-sits-behind-exchangehistoryport.md) — mirrors ExchangeStreamPort for the REST side
- [0028](0028-indicator-series-are-named-by-dotted-source-one-field-per-da.md) — indicator series are named by dotted source, one field per DataRequest
- [0029](0029-support-resistance-zones-come-from-causally-confirmed-cluste.md) — support/Resistance zones come from causally-confirmed, clustered pivots
- [0030](0030-apps-api-gets-jest-for-unit-tests.md) — apps/api gets Jest for unit tests
- [0031](0031-news-collector-multi-provider-architecture.md) — news collector multi-provider architecture and sentiment decoupling
- [0032](0032-server-owned-reconnect-and-gap-backfill.md) — server-owned reconnect and gap backfill
- [0033](0033-strategies-are-registered-explicitly.md) — strategies are registered explicitly
- [0034](0034-backtest-execution-rules-for-entry-price-trading-fees-and-wa.md) — backtest execution rules for entry price trading fees and warmup periods
- [0035](0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md) — metric evaluation formulas for profit calculation modes, drawdown tracking, and statistical metrics
- [0036](0036-overall-score-formula-and-trade-count-damping-for-leaderboar.md) — overall score formula and trade count damping for leaderboard
- [0037](0037-domain-guided-search-uses-group-composition-and-top-history.md) — domain-guided search uses group composition and a top-result history
- [0038](0038-search-runs-carry-strategy-universe.md) — search runs carry selected strategy versions
- [0039](0039-news-sentiment-strategy-and-causal-aggregation.md) — news sentiment strategy plugs into the strategy registry with causal aggregation
- [0040](0040-realtime-watched-candles-are-read-live-from-the-exchange-not.md) — realtime-watched candles are read live from the exchange, not persisted
- [0041](0041-dataset-creation-fetches-and-stores-its-own-candle-range-fro.md) — dataset creation fetches and stores its own candle range from the exchange, paginated
- [0042](0042-the-search-worker-evaluates-and-records-experiments-through.md) — the search worker evaluates and records experiments through EvaluatorPort, not its own repository
- [0043](0043-backtest-screen-supports-full-candidate-specification-inspec.md) — backtest screen supports full candidate specification inspection and auto execution
- [0044](0044-domain-errors-carry-their-http-status-and-a-global-filter-ma.md) — domain errors carry their HTTP status and a global filter maps them
- [0045](0045-a-paused-run-stops-spending-its-budget-and-holds-a-lease-ins.md) — a paused run stops spending its budget and holds a lease instead
- [0046](0046-the-timeframe-set-follows-section-3-and-adds-30m-and-2h.md) — the timeframe set covers every example in the brief
- [0047](0047-a-run-reports-the-candidate-being-tested-right-now.md) — a run reports the candidate being tested right now



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

**Who writes which record (T28)** — the Trello board has no card for it, and it is
marked directly.

All three details that sat inside settled records are now answered inside them: the
canonical form and the rounding before hashing in `0009`, and both the validator's end of
the queue and the fate of a malformed specification in `0007`.
