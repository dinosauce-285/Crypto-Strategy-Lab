# The weight grid and default threshold live in the contract, not in the generator

## Why this

`CandidateMember.weight` is documented in `packages/contracts/src/candidate.ts` as
strictly above 0, a multiple of 0.1, and summing to 1 across a specification, and
`validateSpec` refuses anything else. Until now the only code that could satisfy that
rule was `balancedWeights()` inside `apps/api/src/search/candidate-space.ts`, private to
the search generator, alongside a private `DEFAULT_THRESHOLD = 0.3`.

That left the rule described in one package and implemented in another, and the drift
had already started: the Backtest screen builds its own single-member specification with
`threshold: 0.5` (`apps/web/src/screens/BacktestScreen.tsx`), a different number from the
one every generated candidate carries, for no reason anybody wrote down. A second
producer of specifications — the manual composite builder on the Search screen — would
have made three.

`balancedWeights`, `DEFAULT_THRESHOLD` and the member ceiling now sit in
`packages/contracts/src/candidate.ts`, next to the comment that states the rule. The API
generator and the browser import the same function, so a specification built by hand and
one drawn by the search engine are shaped by identical code.

## What else we looked at

**Leaving the helper in the API and duplicating it in the browser** — six lines, no
package to touch, no record to write. Rejected because the browser would then hold a
rule about what a valid candidate is, which `apps/web/docs/UI_CONSTRAINT.md` forbids
outright, and because two copies of a grid rule is exactly how the 0.3/0.5 threshold
split happened in the first place.

**An endpoint that builds a balanced specification server-side** — the browser would
post its chosen strategies and receive a specification back. It keeps every rule on the
server, but it adds a round trip and an endpoint to a screen that already holds the
strategy list, and the weights have to be visible in the UI before the user commits to
them anyway.

**Exporting the generator's module from the API package** — the web app does not depend
on the API package and should not start; the contract package is the only thing both
sides already import.

## Trade-offs

Contracts is now the home of a small piece of behaviour rather than types alone. That is
a real widening of what the package is, and it is justified only for rules that a
specification must satisfy to be accepted — the grid, the sum, the ceiling of ten
members that `balancedWeights` throws above. Anything that merely helps build a
specification stays with its caller.

The Backtest screen's `threshold: 0.5` is left as it is by this change. It is a
single-member specification, where the threshold decides how strong one signal must be
rather than how much agreement a committee needs, so the two numbers are not obviously
the same question. Naming that difference, or removing it, belongs to whoever next
touches that path.
