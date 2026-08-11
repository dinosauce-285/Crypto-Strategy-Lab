# apps/web — Claude entry point

Read [`../../AGENTS.md`](../../AGENTS.md) first.

Before editing anything here, read [`docs/UI_CONSTRAINT.md`](docs/UI_CONSTRAINT.md).
It is the binding contract for tokens, screen states, contrast, icons and charts.

For any design work — a new screen, a component, tokens, layout, how a chart looks — load
the `impeccable` skill first. It is installed at `.claude/skills/impeccable`.

Two things that are never negotiable here: reuse what the repo already owns instead of
hand-rolling a second one, and never compute business values in the browser. The frontend
renders what the API returned.

Checks for this package:

```bash
pnpm lint
pnpm lint:ui
pnpm build
```

Then open it in a browser and produce all four states — including unplugging the API to see
what the error state does.
