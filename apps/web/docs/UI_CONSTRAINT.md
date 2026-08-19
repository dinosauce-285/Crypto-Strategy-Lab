# UI constraint — apps/web

Binding for every file under `src/`. Read before writing any screen or component.

Design work should use the frontend design helper available in the contributor's local
agent harness. In the author's local Claude setup that helper is `impeccable`; another
agent may name or implement it differently. This file holds the rules that survive
whatever the design turns into — the ones a reviewer can check without opinion.

Two files, two jobs: this one is the law a reviewer checks, and
[`DESIGN.md`](DESIGN.md) is the visual system that law produced — palette, type scale,
component states, the named rules. Strategy behind both lives in [`PRODUCT.md`](PRODUCT.md).
A rule belongs in exactly one of the three.

## Two rules that outrank the rest

**Reuse.** Never hand-roll what the repo already has. Before adding a component, look in
`src/components/`. A second table, a second modal, a second stat tile is worse than an
imperfect first one, because now every future change has two homes.

**No business logic here.** The frontend renders what the backend computed. No strategy
maths, no backtest simulation, no profit calculation, no ranking, no signal derivation.
This is one of the five anti-patterns the brief marks down, and it is the easiest of the
five to slide into — the moment a number is computed in a component instead of read from a
response, the boundary is gone.

## Non-negotiable

- **Tokens, never raw colour.** No hex, `rgb()` or `hsl()` outside the token file. If a
  colour is needed and no token fits, add the token. Enforced by `pnpm lint:ui`.
- **Every screen handles four states**: loading, empty, error, and has-data. A screen that
  only renders the happy path is not finished. The empty state says what to do next; the
  error state says what broke and how to retry.
- **Body text hits 4.5:1 contrast** against its background, large text 3:1. Placeholder
  text is body text for this purpose. Light grey "for elegance" is the most common way an
  interface becomes unreadable.
- **One icon family, one stroke width** across the whole app. Mixing two sets reads as
  unfinished more than any other single thing.
- **One control height per row.** Inputs, selects and buttons sitting together share a
  height token. Mismatched heights in a toolbar is the tell of an assembled UI.
- **Line length capped at 65–75ch** for prose.
- **No frame inside a frame.** An input inside an already-bordered panel does not get its
  own heavy border.
- **z-index comes from one scale**, defined once. No ad-hoc `z-index: 9999`.

## Charts

The chart library is the one decided in T06 and it is the only one. Do not add a second
charting dependency for a different screen.

- Chart colours come from tokens like everything else. Buy and sell markers use the
  semantic success and danger tokens, not arbitrary green and red.
- Every chart is readable without colour alone — shape, position or label carries the
  meaning too. Long and short, buy and sell, profit and loss must be distinguishable in
  greyscale.
- A chart with no data shows the empty state, not an empty grid.

## Before saying it is done

```bash
pnpm --dir apps/web lint
pnpm --dir apps/web lint:ui
pnpm --dir apps/web build
```

Then open it. A screen that has not been looked at in a browser is not done, and the four
states are checked by actually producing them — unplug the API and see what the error state
does.

## Not yet decided

The token set, the component kit and the chart library are task **T04** and **T06**. Until
those land, this file states the rules; `impeccable` produces the system that satisfies
them. Run it once the first real screen exists, not before — it needs something to shape.
