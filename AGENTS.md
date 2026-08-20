# AGENTS.md — Crypto Strategy Lab

Universal instructions for any AI coding agent (Claude, Codex, Cursor, Windsurf...).
This is the canonical source of truth. Tool-specific machinery is local and untracked.
Fresh clones should ask their agent to read `docs/agent-harness.md` and create the
right local harness for that tool.

## What this project is

A laboratory for combining crypto trading strategies: plug in analysis methods,
combine them automatically, backtest each combination, score it, rank it, repeat.

**What is graded is the architecture, not the returns.** The measure is how many
places have to change when a new strategy, a new search algorithm, or a new
exchange is added. One new file = good. Six edits across the system = bad.

Full brief breakdown: `docs/project-breakdown.html` (29 tasks / 6 vertical slices).
Open decisions: `docs/decisions-to-lock.html`.

## Stack

TypeScript end to end. NestJS API, React + Vite web, one shared types package that both
import. PostgreSQL through Prisma 7. An in-process event bus for notification, a Redis-backed
queue for work. Sentiment classification through a hosted model behind a provider interface.

Each of those is a decision with a record in `docs/decisions/` explaining what it cost.

```
apps/api            NestJS — modules are the architecture
apps/web            React + Vite — renders, never computes
packages/contracts  shared types, imported by both
```

Two folders carry their own binding constraints, and they win inside their folder:
`apps/api/docs/BACKEND_CONSTRAINT.md` and `apps/web/docs/UI_CONSTRAINT.md`.

## Architecture

```
Frontend  ──API/WebSocket──►  Backend
                                 ├── Market Data Service ──► Exchange Adapter ──► Binance
                                 ├── Strategy Service ──► Registry ──► Combination ──► Backtester ──► Evaluator ──► Leaderboard
                                 └── News Service ──► Providers ──► Sentiment Service
```

Dependency direction is one-way, left to right. Nothing downstream imports anything upstream.

## Iron Rules

1. **Every architectural decision gets an ADR before the code merges.** See
   *Decision records* below. A decision made in chat and never written down does
   not exist — the report is what is marked.
2. A strategy contains trading logic only. No exchange calls, no database access,
   no chart code, no notifications inside it.
3. Adding a strategy = one new file + one registration line. If a change needs
   more than that, the registry is wrong — fix the registry, not the caller.
4. Evaluation is separate from implementation. A strategy emits signals; it never
   computes its own profit.
5. Business logic never lives in the frontend. No strategy maths, no backtesting,
   no profit or ranking calculation in React.
6. The frontend never talks to an exchange directly, and never polls for prices —
   the server pushes.
7. A backtest may never read data later than the candle it is standing on, and
   re-running one must produce an identical result.
8. No unbounded loops. The search loop must have an explicit stop condition.
9. Conventional commits, scope = module. Quality gates pass before any commit.

## Forbidden (these cost marks — brief section 44)

| Anti-pattern | What it looks like |
| --- | --- |
| God Service | one service fetching data, computing indicators, crawling news, running ML, backtesting, ranking and pushing WebSocket messages |
| Hard-coded strategy | `if MA && RSI … else if MA && Bollinger …` |
| Logic in the frontend | React computing profit, ranking or signals |
| Strategy touching the DB | `RSIStrategy` opening a database connection |
| Crawler welded to ML | the news crawler calling the sentiment model |

## Decision records

Location: `docs/decisions/`. One file per decision.

**Write one when a change does any of these:**

- introduces or changes a shared type, interface or event contract
- changes the database schema
- changes how modules communicate (direct call ↔ event ↔ queue)
- adds a dependency, service or piece of infrastructure
- changes backtest or scoring rules (entry price, fees, drawdown maths)
- picks one of the open decisions listed in `docs/decisions-to-lock.html`

**Each record answers three things and nothing else:**

1. **Why we chose this** — the reasoning, and which requirement it serves.
2. **What else we looked at** — the real alternatives, and what each would have
   cost us here. Include the option a reader would expect us to pick; leaving it
   out looks like we never thought of it.
3. **Trade-offs** — what we give up in return. A record with nothing here has not
   been thought through.

Start from `docs/decisions/0000-template.md`.

## Workflow

Work is cut into **vertical slices**, not layers. Every slice ends in something
clickable. Do not open the next slice until the current one closes.

```
Slice 0 Foundation → 1 Realtime charts → 2 Run one strategy
      → 3 Search combinations → 4 News & sentiment → 5 Hand-in
```

Within a slice, backend tasks run in parallel; the task that closes the slice is
the one with a screen. Task IDs (`T01`…`T29`) match `docs/project-breakdown.html`
and the Trello board, and are used as branch and commit scopes.

## How to write documents here

Documents record **reasoning**, not process. Applies to decision records,
the architecture document, the README, everything.

- No status fields, owners, dates, ticket IDs or approval ceremony unless someone
  genuinely reads them. They rot faster than the content and nobody checks them.
- Do not explain the folder layout or how the document is structured. Explain the
  thing. A reader who wants the layout can look.
- Say what was given up, not only what was gained. A page with no cost in it reads
  as marketing and gets discounted.
- Plain sentences over tables of metadata. Use a table when comparing options,
  not to make prose look organised.
- Shorter is better, but never at the price of the *why*. Cut the scaffolding,
  keep the argument.

## Agent harness

The repo commits project law, not one vendor's runtime config. A Claude, Codex,
Cursor, Windsurf or other setup must be generated locally from the same source:

1. Read this file first.
2. Read `docs/agent-harness.md` for the required harness shape.
3. Read nested constraints before touching their folders:
   `apps/api/docs/BACKEND_CONSTRAINT.md` and `apps/web/docs/UI_CONSTRAINT.md`.
4. Create tool-specific local files only in ignored paths, such as `.claude/`,
   `.codex/`, `.cursor/` or the equivalent for that agent.

The local harness may add hooks, subagents, memories, skills or prompt files, but it
must not replace these rules or weaken the gates in `.githooks/`.
Before committing, every contributor must confirm their own agent runtime files are
ignored and untracked. If a personal harness file appears in `git status`, stop and
move it under an ignored path or remove it from the index with `git rm --cached`.

## Development discipline

Detail lives in `docs/agent-harness.md`. The short version:

- YAGNI / KISS / DRY — three similar lines beat a premature abstraction
- ~200-line file limit — split into focused modules, don't grow files
- No narration comments — the commit message is where "why I changed this" belongs
- No mocks that hide the real failure
- Naming: kebab-case for files, PascalCase for types and components
- Every finding or review comment carries a `file:line` citation

## Commands

```bash
pnpm dev          API on :3001, web on :5173
pnpm worker       a backtest worker — its own process, ADR 0004. Run as many as you like
pnpm build        contracts, then api, then web
pnpm lint         both apps plus the UI token check
pnpm commit       guided conventional commit — use this, not git commit
pnpm db:generate  regenerate the Prisma client after a schema change
```

Postgres runs in the local `ai_erp_db` container on 5432, in its own database
`crypto_strategy_lab`. Nothing is shared but the server process. Redis runs in the local
`redis` container on 6379 and carries the backtest queue; without it the API starts and a
search run cannot.

## Environment

**One `.env` per app.** `apps/api/.env` holds server secrets; `apps/web/.env` holds
browser values. There is no `.env` at the workspace root.

The split exists because Vite inlines every variable it loads into the shipped bundle.
So the rule is not about tidiness, it is a boundary:

- `apps/api/.env` — `DATABASE_URL`, `GROQ_API_KEY`, exchange URLs. Never leaves the server.
- `apps/web/.env` — **`VITE_`-prefixed names only**, and everything in it is public by
  definition. A key, a token, a password or a database URL in this file is a leak waiting
  for the next build.

The session-start hook enforces that boundary: it flags any non-`VITE_` name in the web
env file, and reports either app's `.env` drifting from its `.env.example`.

Only the examples are committed. Both plaintext files are gitignored.

**The API env is committed encrypted.** `apps/api/.env` is encrypted with `age` into
`envs/api.env.age`, which *is* in git. The private key `.env.key` never is — a teammate
hands it over once through a private channel.

```bash
pnpm env:decrypt    # after cloning, or when someone pushed new values
pnpm env:encrypt    # after changing a value, before committing
```

The reason is not tidiness. Without this, the way a key actually reaches a teammate is a
chat message — and that is how it ends up somewhere permanent. `apps/web/.env` is not
encrypted because everything in it ships to the browser anyway; there is nothing to hide.
