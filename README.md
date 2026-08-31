# Crypto Strategy Lab

A platform for combining crypto trading strategies, backtesting every combination,
scoring it and ranking the results — then looping to find better ones.

What is being graded here is the architecture, not the returns. The measure is how many
places have to change when a new strategy, a new search algorithm or a new exchange
arrives. One new file is good. Six edits across the system is not.

[`AGENTS.md`](AGENTS.md) is the law. [`docs/architecture.md`](docs/architecture.md) is how
the parts fit. [`docs/decisions/`](docs/decisions/) is why each one looks the way it does.

## Install

Node 22+ and pnpm 11+. Two containers have to be up — Postgres on 5432 and Redis on 6379.
Locally those are the `ai_erp_db` and `redis` containers that already run; this project
uses its own database inside the first and the default instance of the second.

```bash
docker exec ai_erp_db psql -U postgres -c "CREATE DATABASE crypto_strategy_lab;"

cp apps/web/.env.example apps/web/.env
pnpm env:decrypt          # needs .env.key from a teammate; writes apps/api/.env

pnpm install
pnpm db:generate
```

`apps/api/.env` is committed **encrypted** as `envs/api.env.age`. The private key
`.env.key` never is — a teammate hands it over once through a private channel. Install
`age` first (`sudo apt install age`, or a binary from the age releases page).

There are two env files, one per app, and the split is a security boundary rather than a
preference: Vite inlines everything it loads into the shipped bundle, so `apps/web/.env`
holds `VITE_`-prefixed public values only and every secret stays server-side. See
*Environment* in [`AGENTS.md`](AGENTS.md).

Prisma 7 generates its client into `apps/api/src/generated/` (gitignored), so
`pnpm db:generate` runs once after cloning and again after every schema change.

## Run

Two commands, in two terminals:

```bash
pnpm dev        # API on :3001, web on :5173
pnpm worker     # a backtest worker — start as many as you like
```

Open http://localhost:5173. Five screens:

| Screen | What it does |
| --- | --- |
| **Realtime** | four live charts of one pair at four timeframes, plus a trade tape |
| **Backtest** | pick a dataset and a strategy, run one backtest, see its trades on the chart |
| **Search** | start a bounded search run, watch it, pause or stop it |
| **Leaderboard** | every completed experiment for a dataset, ranked |
| **News** | collected articles and their sentiment split |

Without Redis the API still starts and every other screen works — starting a search run
answers 503 rather than hanging, which is the difference between a missing service and a
broken one.

The worker is a separate process on purpose: a backtest is CPU-bound, and running it
inside the API would stall the very WebSocket that reports its progress
([ADR 0004](docs/decisions/0004-bullmq-for-backtests.md)).

## Architecture

Three processes over one codebase, and a shared type package neither side owns.

```
apps/web            React + Vite — renders, never computes
apps/api            NestJS — modules are the architecture
apps/api (worker)   the same code, booted from BacktestWorkerModule, no HTTP
packages/contracts  shared types, imported by both
```

Data flows one way: exchange → market → indicator → strategy → backtest → evaluation →
ranking → screen. Nothing downstream reaches back. A strategy contains trading logic and
nothing else — no exchange calls, no database, no chart code — which is what makes adding
one a single file plus a single line in `registered-strategies.ts`.

Modules never call each other to announce something. Nine events do that, and the browser
is reached through one Socket.IO channel addressed by topic, so a screen watching four
charts holds one connection.

The full picture — system context, module decomposition, component responsibilities, and
the data, realtime, strategy and search flows — is
[`docs/architecture.md`](docs/architecture.md).

## Demo

The path through the app, in the order the brief asks for it:

1. **Realtime** — open BTCUSDT, watch four timeframes update and the trade tape fill.
2. **Backtest** — pick a dataset, choose a strategy and its parameters, run it. Trades
   are drawn on the chart and the metrics panel fills.
3. **Search** — pick the strategies allowed into the run, give it a bound, start it.
   Progress shows candidates tested, queue depth, failures, average backtest time and the
   current leader.
4. **Leaderboard** — ranked results for the dataset. Click one to inspect its trades.
5. **News** — collect articles, see the sentiment split and how it feeds the sentiment
   strategy.

Steps 3 and 4 do not yet complete: every candidate a search run queues fails, because the
worker asks for an evaluator nothing provides. The single backtest of step 2 takes a
different path and works. Both open seams are written up in the last section of
[`docs/architecture.md`](docs/architecture.md).

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | API and web together, colour-coded output |
| `pnpm dev:api` · `pnpm dev:web` | one side only |
| `pnpm worker` | one backtest worker |
| `pnpm build` | contracts, then API, then web |
| `pnpm lint` | across the workspace, plus the UI token check |
| `pnpm quality` | lint + build — the gate the git hooks run |
| `pnpm db:generate` | regenerate the Prisma client |
| `pnpm db:migrate` · `pnpm db:studio` | Prisma migrations, Prisma Studio |
| `pnpm commit` | guided conventional commit — use this, not `git commit` |
| `pnpm decision "<the choice>"` | start a decision record |
| `pnpm env:encrypt` · `pnpm env:decrypt` | the API env, encrypted with age |

## Contributing

Branch per task, named after its ID in [`docs/project-breakdown.html`](docs/project-breakdown.html):
`T11-strategy-registry`. Commit with `pnpm commit` — it writes a conventional message and
takes the scope from the branch name, so that branch produces `feat(strategy-registry): …`.

A change that moves a contract, the schema, how modules talk, or the scoring rules needs a
record under [`docs/decisions/`](docs/decisions/) in the same change. The pre-push hook
refuses the push otherwise, and the reason is that a decision made in chat and never
written down does not exist.

Agent instructions: [`AGENTS.md`](AGENTS.md) is the shared law, and
[`docs/agent-harness.md`](docs/agent-harness.md) tells Claude, Codex, Cursor, Windsurf or
another coding agent how to build its own local harness. Tool-specific files stay local
and ignored; the committed files are the contract.
