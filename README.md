# Crypto Strategy Lab

A platform for combining crypto trading strategies, backtesting every combination,
scoring it and ranking the results — then looping to find better ones.

What is being graded here is the architecture, not the returns. See
[`AGENTS.md`](AGENTS.md) for the rules, [`docs/project-breakdown.html`](docs/project-breakdown.html)
for the 29 tasks, and [`docs/decisions/`](docs/decisions/) for why the stack looks
the way it does.

## Install and run

Needs Node 22+ and pnpm 11+. Postgres is the container already running locally
(`ai_erp_db` on 5432) — this project uses its own database inside it, so there is nothing
extra to start.

```bash
cp apps/web/.env.example apps/web/.env
pnpm env:decrypt          # needs .env.key from a teammate; writes apps/api/.env
docker exec ai_erp_db psql -U postgres -c "CREATE DATABASE crypto_strategy_lab;"
pnpm install
pnpm db:generate
pnpm dev                  # API on :3001, web on :5173
```

Open http://localhost:5173. The page reports whether the API, Postgres, the event
bus and the shared type package are all wired — that is all it does, and all task
T01 asks for.

Prisma 7 generates its client into `apps/api/src/generated/` (gitignored), so
`pnpm db:generate` has to run once after cloning and again after every schema change.

`apps/api/.env` is committed **encrypted** as `envs/api.env.age`; the key `.env.key` is
never in git and comes from a teammate over a private channel. Install `age` first
(`sudo apt install age`, or grab the binary from the age releases page).

There are two env files, one per app, and the split is a security boundary rather than a
preference — see *Environment* in [`AGENTS.md`](AGENTS.md). Short version: anything in
`apps/web/.env` ends up in the browser bundle, so only `VITE_`-prefixed public values go
there and every secret stays in `apps/api/.env`.

## Scripts

| Command | Does |
| --- | --- |
| `pnpm dev` | API and web together, colour-coded output |
| `pnpm dev:api` · `pnpm dev:web` | one side only |
| `pnpm build` | contracts, then API, then web |
| `pnpm lint` | across the workspace |
| `pnpm db:generate` | regenerate the Prisma client |
| `pnpm db:migrate` · `pnpm db:studio` | Prisma migrations, Prisma Studio |
| `pnpm commit` | guided conventional commit — use this instead of `git commit` |
| `pnpm env:decrypt` · `pnpm env:encrypt` | the API env, encrypted with age |
| `pnpm quality` | lint + build — the same shared gate CI runs |

## Layout

```
apps/api            NestJS — modules are the architecture
apps/web            React + Vite — renders, never computes
packages/contracts  shared types, imported by both
docs/               the brief, the task breakdown, the decision records
```

Agent instructions: [`AGENTS.md`](AGENTS.md) is the law, and
[`docs/agent-harness.md`](docs/agent-harness.md) tells Claude, Codex, Cursor,
Windsurf or another coding agent how to create its own local harness. Tool-specific
files such as `.claude/`, `.codex/`, `.cursor/`, `CLAUDE.md` and nested `CLAUDE.md`
files stay local and ignored; the committed files are the shared contract.

## Committing

Use `pnpm commit`. It walks you through type, scope and subject and writes a
conventional commit; the scope defaults to the branch name, so a branch called
`T11-strategy-registry` produces `feat(strategy-registry): …`.

Branch per task, named after its ID from the breakdown: `T11-strategy-registry`.
