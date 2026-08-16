# Coding Agent Harness

This project keeps the shared law in git and keeps tool-specific machinery local.
The goal is simple: anyone can clone the repo, ask their coding agent to read this
document, and have that agent build the right local harness for its own runtime.

## Bootstrap prompt

Use this after a fresh clone:

```text
Read AGENTS.md and docs/agent-harness.md. Then inspect the files those documents
name. Create any local, tool-specific agent config you need for your own runtime,
but keep it in ignored paths only. Preserve the project rules, git gates, folder
constraints and verification commands. Do not move business logic into the
frontend, do not bypass ADR requirements, and do not commit secrets.
```

## What must be shared

The shared contract is intentionally small:

- `AGENTS.md` is the canonical project instruction file.
- `apps/api/docs/BACKEND_CONSTRAINT.md` binds API work.
- `apps/web/docs/UI_CONSTRAINT.md` binds web work.
- `docs/decisions/` records architectural decisions.
- `.githooks/` contains repo-level gates that every contributor gets on install.
- `package.json` commands are the supported verification surface.

Everything else is an adapter from those rules to one agent's features.

## What stays local

Local harness files are useful, but they belong to the person and tool running the
work. Keep them out of git:

- Claude Code: `.claude/`, `CLAUDE.md`, nested `CLAUDE.md` files.
- Codex: `.codex/` or local skill/plugin state.
- Cursor/Windsurf/others: their equivalent prompt, rule, memory, hook or workflow
  folders.

If your agent needs a file that would normally be committed by that tool, create
it anyway, but keep it under an ignored path or a personal global config.

If a harness file was already tracked, adding it to `.gitignore` is not enough.
Remove it from the index with `git rm --cached` so GitHub stops receiving it while
the local file stays on disk.

Before committing, check `git status --short`. Personal agent runtime files must
not appear as added or modified files. If they do, either move them under an
ignored path, add the tool's local runtime path to `.gitignore`, or remove the
already-tracked path from the index with `git rm --cached`.

## Required harness behavior

When an agent creates its local harness, it must preserve these behaviors.

### Startup

- Read `AGENTS.md` first.
- Check the current task against `docs/project-breakdown.html` when a task ID is
  present.
- Surface open decisions from `docs/decisions-to-lock.html` before implementing
  code that would settle one.
- Check env boundaries: server secrets live in `apps/api/.env`; browser env names
  in `apps/web/.env` must start with `VITE_`.

### Before editing

- Read the nearest folder constraint before changing code in `apps/api` or
  `apps/web`.
- Inspect neighbouring modules and follow the local shape.
- Decide whether the change needs an ADR before writing the code.
- Refuse to read generated/vendor output unless needed for debugging:
  `node_modules/`, `dist/`, `build/`, coverage output and generated Prisma client.

### While editing

- Keep strategy logic isolated from exchange calls, database access, frontend code
  and notifications.
- Keep business calculations out of React.
- Prefer small focused files, kebab-case filenames and existing repo patterns.
- Avoid `as any`, `@ts-ignore`, narration comments and mocks that only hide the
  real failure.

### Verification

- Run the narrow package check while developing.
- Before declaring done, run `pnpm lint` and `pnpm build`.
- For UI work, open the screen and check loading, empty, error and populated
  states.
- For API work, call the endpoint or exercise the service through a local script
  or shell command.

### Git and safety

- Use `pnpm commit` instead of direct `git commit`.
- Do not stage plaintext env files, private keys, credentials or `.mcp.json`.
- Do not bypass `.githooks/` unless the user explicitly accepts the trade-off.
- If a contract changed, include a decision record in `docs/decisions/`.

## Optional local capabilities

Agents should map these to their own features when available:

- A startup reminder for open decisions and env drift.
- A pre-tool guard that blocks secret paths and generated/vendor reads.
- A post-edit formatter for files the agent changed.
- A decision reminder after contracts, Prisma schema or module wiring changes.
- A small set of local subagents or modes for planning, code review, debugging
  and security review.
- A frontend design helper loaded before screen, component, token, layout or chart
  work.
- A strategy helper loaded when adding a new strategy.

These are adapters, not new project law. If an adapter conflicts with
`AGENTS.md`, `AGENTS.md` wins.

## Fresh-clone checklist

1. Install dependencies with `pnpm install`.
2. Let `prepare` enable `.githooks/`.
3. Generate runtime files with `pnpm db:generate` when the API env is available.
4. Ask your coding agent to run the bootstrap prompt above.
5. Keep the created harness local; commit only shared project files.
