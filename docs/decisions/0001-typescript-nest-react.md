# TypeScript on both ends: NestJS backend, React + Vite frontend

## Why this

One language across frontend and backend lets the shared types live in a package
both sides import. `Candle`, `Signal`, `CandidateStrategy`, `Trade` and `NewsItem`
stop being a document everyone agrees to follow and become something the compiler
checks. For a project where the grade rests on the contracts between modules, that
turns the most expensive class of mistake into a build error.

NestJS because it already contains the thing the brief is asking for. Section 12
says to research Strategy Pattern, Plugin Architecture, Factory, Registry and
Dependency Injection; Nest ships a DI container and a module system, so the
registry is a provider, the generator is an injection token, and swapping random
search for a domain-guided one is a single line in a module declaration. When the
lecturer runs the section 42 scenario we change that line and nothing downstream
notices. The `@Module` declarations also *are* the container decomposition that
section 45 asks for in the architecture document, so the diagram cannot drift away
from the code.

Its module boundaries are enforced rather than agreed: if a module does not export
a service, nothing outside can inject it. Our rule that dependencies only point one
way stops being a code-review comment and becomes a runtime failure.

Vite because the development loop matters here — four live charts on a WebSocket
means constant reloading, and instant start with state-preserving hot reload
compounds over a term. A plain single-page app also keeps the section 44 rule easy
to honour: the browser only renders what the backend computed, because there is
nowhere else for logic to hide.

## What else we looked at

**Python with FastAPI** — the strongest alternative. Pandas makes the numeric side
faster to write and faster to run, and the sentiment model would live in the same
language as everything else. It loses the shared frontend/backend types, and its
module boundaries are conventional rather than enforced. If the team were stronger
in Python this would be the right call and the architecture story would survive
almost intact.

**Express** — less to learn, and perfectly capable. But the registry and the
dependency wiring would be hand-rolled, which means at the defence we would be
explaining our mechanism instead of pointing at one. That is a worse position for
the exact thing being examined.

**Java with Spring, or .NET** — arguably the best fit for this rubric; the DI and
module story is even stronger. Wrong cost for five students in one term: the time
would go into configuration rather than into the twenty-nine tasks.

**Next.js instead of Vite** — server-side rendering solves nothing here. There is
no SEO requirement and the data is all live behind a session, so it adds a server
tier that no driver justifies. Worse, server actions create a place for business
logic to leak into the frontend, which is the third anti-pattern in section 44.

**Vue or Svelte instead of React** — technically equal for this. The charting
library is imperative, so the framework barely matters. React wins on the number of
existing TradingView examples and on what the team already knows, not on merit.

## Trade-offs

Nest has a real learning curve — decorators, modules, providers, injection tokens.
Two or three days before it feels natural for someone who has only used Express.
That cost lands entirely in the foundation slice, which one person owns, so it
blocks nobody; but it is a genuine cost and it buys architecture rather than
features. On a project graded on features this would be the wrong trade.

Choosing TypeScript would normally push the sentiment model into a second runtime,
since the model ecosystem lives in Python. Calling a hosted model instead avoids
that, so the project stays one language end to end — but it trades a local model for
a network dependency, which is its own decision and is recorded separately.

Numeric loops in TypeScript are slower than vectorised pandas. Caching indicators
per parameter set should keep backtests comfortable at the scale required, but if
backtesting turns out to be the bottleneck, this decision is where it came from.
