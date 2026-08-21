# apps/api gets Jest for unit tests

## Why this

T10 is the first piece of `apps/api` that is pure computation with no database, no
queue, no exchange and no browser to verify against — MA, RSI, Bollinger and
Support/Resistance are functions of candles in, numbers out. Its own card says so
directly: build and unit-test it alone, no endpoint exists yet for `BACKEND_CONSTRAINT
.md`'s usual "call the endpoint once" check to apply to. No test runner exists anywhere
in this monorepo yet, so this decision is not "which testing feature" but "which
framework, at all."

Jest is NestJS's own scaffolded default and the framework every Nest tutorial and the
official docs assume. `IndicatorService` and every calculator in this change are plain
classes and functions — none of them need `@nestjs/testing`'s `TestingModule` to be
constructed, they are just instantiated directly — but the rest of `apps/api` leans on
`@Injectable()` and constructor injection throughout, and the day a test needs to
bootstrap a real Nest module, Jest is the path with no extra wiring, because
`@nestjs/testing` is built assuming it.

## What else we looked at

**Vitest** — faster, ESM-native, and already the pattern this monorepo knows from
`apps/web`'s Vite setup. It transpiles TypeScript through esbuild by default, which does
not implement `experimentalDecorators`/`emitDecoratorMetadata` the way `ts-jest` does;
making Nest's decorator metadata work under Vitest needs an extra plugin
(`unplugin-swc` or similar) that this repo does not otherwise need. For a codebase built
entirely around `@Injectable()` classes, picking the runner least likely to fight the
decorators felt like the safer default, at the cost of a slower, less modern toolchain.

**No test runner — verify by hand-running a script** — zero new dependency, and the
brief itself only asks for correctness, not a coverage number. Rejected because
`IndicatorService`'s whole job is a set of assertions a human re-checking by eye is bad
at: warmup boundaries, causality (does candle N ever see candle N+1?), and cache-hit
behaviour are exactly the kind of thing a regression silently breaks later without a
test catching it, and there is no browser to notice for this module (Q1's whole point).

## Trade-offs

This is now a monorepo with two different test runners — Jest for `apps/api`, and
whatever `apps/web` eventually picks (nothing yet). That is one more thing a new
contributor has to learn per app rather than one convention repo-wide, and it is the
direct cost of matching each app's own framework default instead of picking one runner
for consistency's sake.

Jest's TypeScript path (`ts-jest`) type-checks and transpiles per file at run time,
which is slower than Vitest's esbuild pipeline. For a project this size that cost is
invisible today; it would not stay invisible if this became a codebase with thousands of
tests.
