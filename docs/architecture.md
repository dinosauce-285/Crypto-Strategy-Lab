# Architecture

Someone opens the app to answer one question: *which combination of trading rules would
have made money on this stretch of market, and how do I know?* Everything here exists to
make that question answerable and re-answerable — a chart to look at, a rule set to
assemble, a simulation that never peeks at tomorrow, a score, and a loop that keeps
trying combinations while you watch.

What is being built is therefore not a trading bot. It is a laboratory, and the property
it is judged on is how little has to change when a new idea arrives. Adding a strategy is
one new file and one line in a list. Adding an exchange is one adapter behind one
interface. That constraint is the reason for nearly every seam described below, and the
reason several of them cost more than the obvious alternative would have.

Reasoning for individual choices lives in [`decisions/`](decisions/) and is linked, never
restated. Behaviour contracts live in [`../openspec/specs/`](../openspec/specs/).

---

## 1. System Context

```
                        ┌──────────────────────────┐
      a person ────────►│   Crypto Strategy Lab    │
      in a browser      │                          │
                        └───┬───────┬──────────┬───┘
                            │       │          │
              klines + live │       │ articles │ classify text
                  trades    │       │          │
                            ▼       ▼          ▼
                        Binance   CryptoCompare   Groq
                                  + RSS feeds   (hosted model)
```

Four things sit outside the boundary, and each is reached through an interface the system
owns rather than through its own SDK:

- **Binance** — the market. Live trades and closed candles arrive over a WebSocket, past
  candles over REST. Behind `ExchangeStreamPort` and `ExchangeHistoryPort`
  ([0027](decisions/0027-the-historical-adapter-sits-behind-exchangehistoryport.md)), so
  the word *Binance* appears in two adapter files and nowhere else.
- **News providers** — CryptoCompare's API and a set of RSS feeds, both behind
  `NewsProvider` ([0031](decisions/0031-news-collector-multi-provider-architecture.md)).
  A feed that dies takes its own articles with it and nothing else.
- **Groq** — a hosted language model that labels an article positive, negative or neutral,
  behind `SentimentProvider`
  ([0005](decisions/0005-sentiment-via-groq.md)). With no API key configured the module
  falls back to a keyword heuristic, so the rest of the system still runs.
- **The browser** — the only client. It renders and never computes: no profit maths, no
  ranking, no signal logic (`AGENTS.md`, iron rule 5).

Postgres and Redis are not actors in this picture. They are ours, and they appear in the
next one.

## 2. Container and module decomposition

Three processes, one codebase, one shared type package.

```
┌────────────┐   HTTP /api        ┌──────────────────────────────┐
│  apps/web  │◄──────────────────►│          apps/api            │
│ React+Vite │   socket /channel  │  Nest — HTTP + push channel  │
└────────────┘◄───────────────────└──────┬───────────────┬───────┘
                                         │               │
                                    Postgres          Redis
                                    (Prisma 7)      (BullMQ queue)
                                         │               │
                                         │        ┌──────▼────────┐
                                         └────────┤ pnpm worker   │
                                                  │ N processes,  │
                                                  │ no HTTP       │
                                                  └───────────────┘

           packages/contracts  — types both sides import, neither owns
```

The worker is the same code booted from a different root module
(`BacktestWorkerModule` — no controllers, no gateway) and it is a separate process on
purpose: a backtest is CPU-bound, and running it in the API would stall the very
WebSocket that reports its progress
([0004](decisions/0004-bullmq-for-backtests.md)). The cost is a queue, a Redis
dependency, and the fact that a specification now has to survive serialisation
([0007](decisions/0007-candidate-as-spec.md)).

Inside the API, Nest modules **are** the architecture. A module reaches only what another
module exports, so the one-way dependency rule is enforced by the framework rather than by
review:

```
   market ────────────┐
   ranking ───────────┼──────►  realtime   (ChannelPublisher, TopicAudience)
   search ────────────┘
      │
      ├──►  market       candles, and the backfill that stores them
      ├──►  strategy     the registry and the factory
      ├──►  indicator    the only importer — indicator is not in app.module
      └──►  evaluation   EvaluatorPort

   news ──news.collected──► sentiment ──news.sentiment.analyzed──► indicator
```

Arrows point the way imports go. Nothing downstream reaches back: a strategy cannot see
the database, the backtester cannot see the browser, and `news` and `sentiment` never
import each other — they meet on an event
([0003](decisions/0003-in-process-event-bus.md)), which is what keeps the crawler from
being welded to the model. `indicator` reaches the graph only through `search`, so nothing
but a backtest can ask for an indicator series.

One file reference runs against an arrow, deliberately: `strategy` binds the
`StrategyFactory` token declared in `search/ports/`. The caller owns the contract, the
plugin side supplies the implementation — otherwise search would import strategy to name
the thing it needs.

Everything the browser touches sits under `/api`, and an error crossing that line carries
its own status: a `DomainError` subclass declares the HTTP code and one global filter turns
it into a response
([0044](decisions/0044-domain-errors-carry-their-http-status-and-a-global-filter-ma.md)).
A missing Redis answers 503, an unknown dataset 404, a malformed specification 400 — each
with a sentence the reader can act on.

`realtime` is the one module almost everything points at, and it exports two abstractions
(`ChannelPublisher`, `TopicAudience`) rather than the gateway itself
([0020](decisions/0020-module-reaches-the-browser-through-ports.md)). A module that
pushes depends on *being able to push*, not on Socket.IO.

## 3. Component responsibilities

One line each. If a component needs two lines, it is doing two jobs.

**market** — serves candles. `GET /api/market/candles` without a range reads recent chart
history directly from Binance ([0040](decisions/0040-realtime-watched-candles-are-read-live-from-the-exchange-not.md)).
`MarketService` holds one watch per pair, seeds its reconnect cursor with one recent
candle from the exchange, reconnects and fills gaps on its own
([0032](decisions/0032-server-owned-reconnect-and-gap-backfill.md)). Watching is
transient: Realtime publishes only closed candles and never persists them. Dataset
creation separately fetches and persists its requested historical range in pages
([0041](decisions/0041-dataset-creation-fetches-and-stores-its-own-candle-range-fro.md)),
so backtests read a reproducible dataset.

**indicator** — turns candles into numbers: moving average, MACD, RSI, Bollinger, support
and resistance zones, and a sentiment series. Every calculator is strictly causal, and a
value is absent rather than approximate until enough candles exist
([0028](decisions/0028-indicator-series-are-named-by-dotted-source-one-field-per-da.md),
[0029](decisions/0029-support-resistance-zones-come-from-causally-confirmed-cluste.md)).
Results are cached per dataset, indicator and parameters, because a search run asks for
the same series thousands of times.

**strategy** — the plugin point. `StrategyRegistry` holds the seven registered
strategies keyed by `id@version` and writes them to the database at boot;
`StrategyFactory` turns a specification into something runnable. A strategy contains
trading logic and nothing else: it reads a context, returns `BUY`/`SELL`/`HOLD` with a
strength ([0006](decisions/0006-signal-carries-strength.md)), and never computes its own
profit.

**search** — the loop and its plumbing: candidate generators, the queue, the runner that
walks candles, the datasets a candidate is judged against, and the single-run path the
Backtest screen uses.

**evaluation** — scores trades into metrics: total return, profit and loss, win rate,
trade count, max drawdown, profit factor, Sharpe
([0035](decisions/0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md)).
Separate from the runner because a thing that produces a result must not be the thing
that grades it.

**ranking** — computes the leaderboard on every read rather than storing it
([0011](decisions/0011-leaderboard-is-recomputed.md)), applying one overall score with
trade-count damping ([0036](decisions/0036-overall-score-formula-and-trade-count-damping-for-leaderboar.md)).
A stored ranking is a cache that is wrong the moment a run finishes.

**news** — collects articles from every provider, deduplicates by URL, emits
`news.collected`. It does not know sentiment exists.

**sentiment** — listens for `news.collected`, classifies, stores the label and score.
An article the provider could not classify stays unscored and is retried; it is never
stored as neutral, because "we don't know" and "neutral" are different facts.

**realtime** — one Socket.IO channel on `/channel`, addressed by topic
([0017](decisions/0017-one-push-channel-addressed-by-topic.md),
[0019](decisions/0019-the-push-channel-runs-on-socket-io.md)). A client watching four
charts holds one connection and four subscriptions.

## 4. Data Flow

Seven tables, and the two that are missing say the most. There is no `Leaderboard` table —
it is recomputed. There is no `Signal` table — a signal is a value inside one run, not a
record.

```
Candle ──┐                     Dataset ◄──── the rules a run was judged by
         │                        │  ▲
         │                        │  └──── DatasetLease ◄── a backtest in flight
         └──► a backtest reads ──┤
                                 ▼
                            Experiment ──► Trade
                            (spec by value,
                             metrics as columns)

Strategy   append-only on (id, version)      News   article + its sentiment
```

`Experiment` carries the whole recipe as JSON rather than a strategy name, so a result
found months ago can still be rebuilt from its own row
([0007](decisions/0007-candidate-as-spec.md)). Metrics are columns rather than a blob
because the leaderboard orders by them. `Strategy` is append-only on `(id, version)`: an
old experiment must keep naming the code that produced it
([0009](decisions/0009-strategy-versioning.md)).

`Dataset` exists as a row rather than as query parameters because it carries the
*judging rules* — entry price, fee rate, warmup, profit mode, drawdown mode
([0010](decisions/0010-dataset-carries-the-backtest-rules.md)). Change a rule and you get
a new dataset, not an edited one, so old results stay valid inside the world they were
measured in. That is also what makes the leaderboard meaningful: everything on it was
judged the same way.

`DatasetLease` is a row rather than a lock held in memory, because what it protects lives
in the database while what holds it lives in another process
([0049](decisions/0049-active-backtests-hold-a-durable-dataset-lease.md)). A backtest takes
a lease before it reads anything, renews it every minute, and deletes it in a `finally`.
The foreign key is `ON DELETE RESTRICT`, so deleting a dataset under a running backtest
fails at the database rather than halfway through the run. Recording the experiment renews
the lease as the first statement of the same transaction, and a lease that has gone rolls
the whole write back: a result filed against a dataset that no longer exists is worse than
no result.

Modules do not call each other to announce things. Nine events do that
(`packages/contracts/src/events.ts`), and a payload carries identifiers rather than the
thing itself wherever the receiver can read it — `leaderboard.updated` says which board
moved, not what it now holds, because the ranking is recomputed and would be stale on
arrival.

## 5. Realtime Flow

The server pushes; the browser never polls (`AGENTS.md`, iron rule 6).

```
Binance REST ──► GET /api/market/candles ──► recent chart history in the browser
                                               (no storage)

Binance WS ──► BinanceStreamAdapter ──► MarketService
                                            │
                            ┌───────────────┴───────────────┐
                            ▼                               ▼
                     channel.publish                   event bus:
                     market:BTCUSDT:1m                 candle.closed
                            │
                            ▼
                     browser, subscribed to that one topic
```

The screen obtains its initial chart history through `GET /api/market/candles` without
`from`/`to`, which reads recent candles directly from Binance. A subscription starts the
streaming work: `TopicAudience` reports that a topic gained its first watcher,
`MarketService` opens the upstream connection and seeds a reconnect cursor with one
recent candle from the exchange. When the last watcher leaves the connection closes.
Nobody streams a pair no one is looking at, and watching never writes candles to storage.

Reconnection is the server's job, not the browser's
([0032](decisions/0032-server-owned-reconnect-and-gap-backfill.md)). On a dropped socket
the service reconnects, fetches the gap from Binance after its cursor, and releases the
recovered and buffered closed candles in order. The browser sees a stutter, not a hole —
and it never learns that the exchange went away, which is the point.

## 6. Strategy Flow

Adding a strategy is one file plus one line in `registered-strategies.ts`
([0033](decisions/0033-strategies-are-registered-explicitly.md)). Nothing else changes:
not the combination engine, not the search space, not the backtester, not the UI.

```
StrategyRegistration { meta, create(params) }
        │
        │  registry lists it ──► the picker on screen
        │                   └──► the search space
        ▼
CandidateSpec { members: [{ id, version, params, weight }], threshold }
        │
        ▼
StrategyFactory.build ──► WeightedRunnableStrategy
                               │
                               │  analyze(context)
                               ▼
                    Σ (direction × strength × weight)
                               │
                    > threshold → BUY   < −threshold → SELL   else HOLD
```

A combination is a weighted vote and only that
([0014](decisions/0014-weighted-merge-only.md)). The alternative — letting combinations
carry their own merge logic — buys expressiveness and costs the thing being graded: the
moment merging is code, adding a strategy stops being one file.

The registry is explicit rather than auto-discovered by scanning the directory. Scanning
would be one line shorter and would make the set of registered strategies depend on the
filesystem, which is not a thing a reader can check.

What a strategy is allowed to see is a `StrategyContext`: candles up to and including the
current index, and an indicator lookup. It cannot see candle `i+1`, cannot reach the
database, and cannot push to the browser — three impossibilities rather than three rules.

## 7. Search / Backtest Flow

The loop must stop, and it must stop for a reason it was given before it started
([0021](decisions/0021-a-search-run-declares-its-bound-before-it-starts.md)). A request
carrying no bound is refused with 400, so "this system cannot run an unbounded search" is
a property of the API rather than a habit.

```
POST /api/search/runs  { datasetId, strategyRefs, bound, mode }
        │
        ▼
   SearchService ── ticks every 500ms ──────────────────────────┐
        │                                                       │
        │ fills the queue up to 50 deep, never past the budget   │
        ▼                                                       │
   CandidateSource ──► random | domain-guided | genetic          │
        │                                                       │
        ▼                                                       │
   BullMQ (Redis) ──────────────────────────────────────────┐   │
                                                            ▼   │
                                        ┌── worker process ─────┴──┐
                                        │  BacktestProcessor        │
                                        │   validate spec           │
                                        │   skip if already run     │
                                        │   lease the dataset       │
                                        │   StrategyFactory.build   │
                                        │   BacktestRunner.run      │
                                        │   score the trades        │
                                        │   write Experiment+Trades │
                                        │   release the lease       │
                                        └───────────┬───────────────┘
                                                    │ job outcome
        ┌───────────────────────────────────────────┘
        ▼
   SearchService updates counters ──► search:<runId> ──► the browser
```

A run picks one generator and keeps it. The genetic mode is the one that spends the
affordance `0013` and `0037` left open: it breeds the next candidates from the best-scoring
ones the run has already produced, while random and domain-guided read that same history
only to avoid repeating themselves
([0050](decisions/0050-a-genetic-search-mode-breeds-candidates-from-the-search-run.md)).

Six things end a run: the candidate budget, wall-clock duration, a plateau of results that
stopped improving, an exhausted generator, someone pressing stop, or a pause left standing
for half an hour. Whichever fires is recorded, because a run that reports only "not
running" cannot be told apart from one that died.

The last of those six exists because of the second. A paused run spends none of its budget
— the duration bound counts active time only
([0045](decisions/0045-a-paused-run-stops-spending-its-budget-and-holds-a-lease-ins.md)) —
which makes a pause a lease rather than a free stay: nothing else can start while it is
held, so it has to expire on its own.

Inside one backtest, causality is the whole game. The runner walks candles forward and
hands the strategy a context sliced at the current index. Under `next-open` rules a signal
raised on candle `i` executes at the open of `i+1`; under `signal-close` it executes at
that candle's close. Fees are charged on both sides. The same specification on the same
dataset is one experiment, enforced by a unique index rather than by every caller
remembering to check.

A failure is written down, not just logged: a bad specification, an unknown strategy or a
missing dataset ends the job on the first attempt rather than being retried into the same
wall, and the row it leaves is where the failed-job count on screen comes from.

---

## Where the drawing and the code disagree

An architecture document that only describes the intended shape is worth less than one
that says where the build has not caught up.

Two seams that used to sit here are closed: the duplicate evaluator port the queued path
asked for (`docs/decisions/0042`), and the leaderboard's `experiment.completed` — a name
outside the contract, emitted by the single-run path alone, which left the board still
during a search. The controller now listens for three contract events and the queued path
emits two of them.

What is left is smaller, and worth writing down rather than discovering twice.

**One of those three events is emitted from one path only.** `leaderboard.updated` comes
from the single-run service and nowhere else, so a single run wakes the listener three
times and a queued candidate twice. The payload is an invalidation ping rather than data,
so the extra frames cost a refetch, not a wrong number — but three names for one occasion
is one name too many.

**`Dataset.to` is exclusive in the schema and inclusive in the reader.** The column is
documented as an exclusive bound; the candle range query asks for `openTime <= to`. A
candle landing exactly on the boundary is inside the dataset in practice and outside it on
paper, and because a dataset's identity is its nine-column key, settling it either way
changes which rows an existing dataset covers.

**Two metrics read a trade differently from the rest.** Total return, profit and loss, max
drawdown and Sharpe derive a trade's return through one function that falls back to the raw
prices when the stored `profit` is unreadable; win rate and profit factor read the stored
value directly. Every row the current runner writes carries a profit, so they agree today
and stop agreeing the first time something files a trade without one.
