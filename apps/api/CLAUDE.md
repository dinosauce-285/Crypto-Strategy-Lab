# apps/api — Claude entry point

Read [`../../AGENTS.md`](../../AGENTS.md) first.

Before editing anything here, read [`docs/BACKEND_CONSTRAINT.md`](docs/BACKEND_CONSTRAINT.md).
It is the binding contract for module layering, database access, DTOs, events and tests.

Look at a neighbouring module before adding one — copy the local shape rather than
inventing a second one. Keep services free of Prisma; the repository is the only place the
database is touched.

Checks for this package:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test
```

Prisma 7: the client is generated into `src/generated/prisma` and is gitignored. After any
schema change run `pnpm db:generate`. The connection URL lives in `prisma.config.ts` and
`.env`, never in `schema.prisma`.
