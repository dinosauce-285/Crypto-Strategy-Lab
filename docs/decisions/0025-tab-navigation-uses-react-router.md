# Tab navigation uses react-router

## Why this

The app is growing a second screen (Backtest, alongside Realtime) and the product call
is that each is a real, addressable place — reload the page on `/backtest` and land on
`/backtest`, not back at a default tab. That single requirement is what decides this:
an in-memory tab index can't survive a reload or be pasted into a message, and building
that back in by hand (reading a tab param out of `location`, writing it back on change,
handling the initial load) is most of a router, worse-tested, for one component.

`react-router` is the library every other choice in `AGENTS.md`'s stack already implies
using something for this exact job (React + Vite has no built-in routing), and its
`NavLink` gives the navbar its active-tab styling for free — `aria-current` handled by
the library, not a second piece of state kept in sync with the URL by hand.

## What else we looked at

**In-memory tab state** (a `useState<'realtime' | 'backtest'>` in `App.tsx`). Zero new
dependencies, and it was the default until this was raised explicitly — rejected only
because reload-to-default and no shareable link are real regressions for a screen
people will bookmark and refer back to, not because it's a bad pattern in general.

**Hand-rolled hash routing** (`location.hash`, no library). Avoids the dependency while
still surviving reload, but it means writing and maintaining the parsing, the
`popstate` handling and the active-link logic ourselves — the exact code `react-router`
already has tests for — to save one dependency on a project that already has several.

## Trade-offs

A new frontend dependency, on a project where `apps/web`'s only runtime dependencies
before this were `react`, `react-dom`, `socket.io-client` and `lightweight-charts` —
one more library whose API the team now has to know, and one more thing to update.

Two tabs today doesn't need a router's full feature set (nested routes, loaders, data
APIs) — this is `BrowserRouter` + two `Route`s, most of the library unused. That's
accepted now because the alternative (hand-rolled hash routing) is real code with real
bugs to own, not because the two tabs justify the library's full weight on their own.
