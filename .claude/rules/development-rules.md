# Development rules

Loaded by the dev-rules reminder and read by every agent before writing code.
The architectural law lives in `AGENTS.md`; this file is about how code is written.

## Before writing

- Read the task's row in `docs/project-breakdown.html`. The *To decide* column names
  the choices you are expected to settle — settle them, do not guess past them.
- Check `docs/decisions/` for a record that already answers the question. If the
  answer is not there and the choice shapes a contract, it needs a record.
- Look at the neighbouring module and copy its shape. A second pattern for the same
  job is worse than an imperfect first one.

## While writing

- YAGNI / KISS / DRY. Three similar lines beat a premature abstraction.
- ~200 lines per file. Past that, split by responsibility, not by size.
- No narration comments. Do not restate what the code or the test name already says,
  and never leave "why I changed this" notes — that belongs in the commit message.
  Keep a comment only for an invariant a reader cannot infer, and keep it to one line.
- No `as any`, no `@ts-ignore`. If a type is wrong, fix the type.
- No mock added purely to make a test pass. Fix the real thing.
- Naming: kebab-case files, PascalCase types and components, camelCase everything else.

## Before saying it is done

- `pnpm lint` and `pnpm build` pass. Both, not one.
- The change runs. A screen change is opened in the browser; an API change is called.
- If it settled a decision, the record in `docs/decisions/` is written — in the same
  change, not queued for later.
