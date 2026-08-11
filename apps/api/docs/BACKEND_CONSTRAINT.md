# Backend constraint — apps/api

Binding for every file under `src/`. `AGENTS.md` at the repo root wins on workspace-wide
matters (paths, commands, branch flow); this file wins on module layering, database access
and testing. If the two disagree, fix whichever is wrong so there is one answer.

Most of this is lifted from a production NestJS codebase that learned it the hard way.
The rules that were specific to that domain have been dropped; what remains is what
survives a change of project.

## Non-negotiable

- **Services never touch `PrismaService`.** Every database access, `$queryRaw` included,
  lives in the module's `*.repository.ts`. A service holding a `PrismaService` dependency
  cannot be unit-tested without a live database, and that is the whole point of the split.
- **Repositories never inject a service.** A repository takes `PrismaService` and pure
  helpers, nothing else. Layering only points one way.
- **No concrete cross-module injection.** Module A consuming module B injects an abstract
  class or an injection token, never the concrete `XxxService`. Do not export a repository
  out of its own module.
- **Public service methods return DTOs, not Prisma rows,** with an explicit
  `Promise<XxxResponseDto>` return type. Contract types live in `dto/`, or in
  `@csl/contracts` when the frontend needs them too.
- **Never `as any` on a Prisma result.** Add the field to `select` instead.
- **No narration comments.** No inline or JSDoc comment restating what the code or the test
  name already says, and no "why I changed this" notes — that belongs in the commit message
  or a decision record. Keep a comment only for an invariant a reader cannot infer, one line.

## Module shape

```
src/<domain>/
  <domain>.module.ts        wiring; declares what leaves the module
  <domain>.controller.ts    HTTP only — no logic, no database
  <domain>.service.ts       the logic; Prisma-free
  <domain>.repository.ts    the only place the database is touched
  dto/                      request and response shapes
  ports/                    interfaces this module needs from others
```

A module exports the smallest surface that its consumers need. Anything not exported is
private by construction — that is Nest enforcing the dependency rule for you, which is
the reason it was chosen over Express (see `docs/decisions/0001-typescript-nest-react.md`).

## Domain rules for this project

These come from the brief and cost marks if broken:

- **A strategy contains trading logic only.** No exchange calls, no database, no chart
  code, no notifications inside it. It receives what it needs through its context.
- **A strategy never reaches the database.** If it needs indicators or sentiment, that
  arrives through the context gateway, not through a repository injected into it.
- **Evaluation is separate from implementation.** A strategy emits signals; computing
  return, win rate or drawdown happens elsewhere and never inside the strategy.
- **Adding a strategy is one file plus one registration line.** If it takes more, the
  registry is wrong. Fix the registry.
- **A backtest never reads a candle later than the one it is standing on,** and running
  the same backtest twice produces identical output.
- **The crawler never calls the sentiment model.** It collects and stores. Classification
  happens behind the sentiment provider interface.
- **No unbounded loop.** The search loop carries an explicit stop condition.

## Events

Publishers and subscribers meet at a name from `@csl/contracts`, never by importing each
other. A module that emits does not know who listens, and a module that listens does not
know who emits — that decoupling is the thing the brief is examining, so importing a
service to call it directly instead is a regression even when it works.

The in-process bus is for notification. Anything that must not be lost goes through the
job queue instead; the two are deliberately different mechanisms.

## Database

- Migrations are files in git, reviewed like code. Never edit an applied migration.
- Prisma 7 has no bundled query engine; the connection arrives through the pg driver
  adapter in `PrismaService`. The connection URL lives in `prisma.config.ts` and `.env`,
  never in `schema.prisma`.
- The generated client goes to `src/generated/prisma` and is gitignored — regenerate with
  `pnpm db:generate` after any schema change, and never edit it.
- A result that must be reproducible later stores what produced it. An experiment row
  without its dataset and strategy version is not evidence of anything.

## Checks before saying it is done

```bash
pnpm --dir apps/api lint
pnpm --dir apps/api exec tsc --noEmit
pnpm --dir apps/api build
pnpm --dir apps/api test
```

All four, and the endpoint actually called once. Building is not verifying.
