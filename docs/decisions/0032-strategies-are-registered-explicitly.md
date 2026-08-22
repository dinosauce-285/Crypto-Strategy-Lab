# Strategies are registered explicitly

## Why this

Section 12 asks for a registry, and section 41 grades the shape by adding a new
strategy under pressure. We choose an explicit list of registrations: a strategy
exports its metadata and factory, and one line adds it to the registry.

That keeps the cost visible. Adding MACD is one new strategy file plus one new entry in
`registered-strategies.ts`; the factory, backtester, UI forms, search space and chart
do not learn a new strategy name. It also fits Nest better than filesystem discovery:
the registry is a provider, the strategy table is synced from metadata at startup, and
the worker receives the same provider when it rebuilds a queued candidate.

Explicit registration is also the easiest version to defend in a live demo. The line
that proves a strategy is available is plain code, checked by TypeScript and reviewed
like any other dependency.

## What else we looked at

**Scanning a directory** -- attractive because adding a file appears to be enough. It
costs runtime loading rules: built TypeScript no longer has the same shape as source,
test runners and production resolve modules differently, and duplicate ids are found
only after the scan has walked the filesystem. It also hides the extension point from
the audience section 41 is written for.

**Hard-coded construction inside the factory** -- `if id === "ma"` and then another
branch for RSI. It is the exact hard-coded strategy anti-pattern from section 44, and
every new strategy edits the factory that should have stayed closed.

**Database-driven strategy definitions** -- useful if strategies were scripts or remote
plugins, but here the behavior is TypeScript code already deployed with the worker. A
row can describe a strategy, but it cannot construct the class without a registry
somewhere else, so it would add a second source of truth rather than replace one.

## Trade-offs

A new strategy still needs one edit outside its own file. Forgetting the registration
line means the file compiles but the strategy is unavailable.

The registry is not a plugin loader. Adding behavior still requires a code change and a
deployment, which is right for this project but less dynamic than loading external
packages.

Because the list is explicit, merge conflicts can happen when two people add strategies
at once. The conflict is small and obvious, but it is still a cost of choosing one
central list.

