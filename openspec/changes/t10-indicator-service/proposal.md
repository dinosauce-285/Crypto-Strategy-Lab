## Why

Sections 7-10 name four indicators — MA, RSI, Bollinger, Support/Resistance — and
section 9 makes the architectural point directly: "the same indicator can produce
several different strategies," meaning an indicator is its own layer, not part of a
strategy. `0008` already gave a strategy the mechanism to ask for one (`requires` /
`StrategyContext.get`); nothing computes what gets handed back yet.

This is built now, standalone, because it has no hard blocking dependency. Its two
callers — the backtest engine (T11-13) via `StrategyContext`, and a chart endpoint
(T14) — don't exist yet, so this change builds and unit-tests the computation layer
alone, with no browser verification possible until one of those callers lands.

**Which screen the second caller is** was genuinely ambiguous going in: the Trello
card's own headline ("Done means: ... draw MA / Bollinger onto the T08 chart") and
`docs/project-breakdown.html` both say T08, already built. But the same card's locked
"Decided" section overrides its own headline: "the API calls it once to draw the MA and
Bollinger lines on the **T14** chart." T08's own shipped proposal agrees with the
override, not the headline — `Annotations.tsx` shipped as "an empty placeholder panel —
no strategy/signal data exists yet (T11+)" — and `backtest-history-chart`, the most
recent chart work merged, explicitly scoped "any strategy-result overlay" out as
"separate, later work." T14 is also the only screen with a concrete strategy and
parameters selected (`MA20`, not abstract `MA`); T08's dashboard has no strategy picker
at all. This change therefore adds no controller and no HTTP surface — nothing calls
this module yet, on either screen.

T10 · [Indicator Service](https://trello.com/c/vC5luI98/9-t10-indicator-service).
Brief: section 5 (chart draws MA, Bollinger); sections 7-10 (the four indicators);
section 9 (indicators are their own layer); section 12 (registry/plugin, applied to
calculators as well as strategies).

## Decisions

**Settled**

- [0008](../../../docs/decisions/0008-strategy-declares-its-data.md) — a strategy
  declares `requires(params)`, the engine prepares it once per dataset and hands it
  over through `StrategyContext.get`. This change is the "engine prepares it" half:
  `IndicatorPort.compute(datasetId, candles, request)` is what a future
  `StrategyContext` implementation calls, once per unique request, before a run starts.
  It also names the two-caller shape (worker + chart endpoint) this change's port is
  built for.
- [0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md) and
  `apps/api/docs/BACKEND_CONSTRAINT.md`'s "no concrete cross-module injection" rule —
  `IndicatorPort` is an abstract class DI token, following the exact shape already used
  twice in `apps/api/src/market/` (`ExchangeStreamPort`, `ExchangeHistoryPort`), bound
  via `{ provide: IndicatorPort, useClass: IndicatorService }`.
- [0012](../../../docs/decisions/0012-strategy-metadata.md) — the registry pattern a
  strategy uses to self-describe is reused here for calculators: a fifth indicator is
  one new calculator file plus one registry line, not a branch inside
  `IndicatorService`.

**To settle** — three records, all written before the code that assumes them:

- **How a multi-series indicator (Bollinger's three bands, Support/Resistance's two)
  fits `DataRequest.source: string` → `number[]`** — new record. Task 0.1.
- **The Support/Resistance zone-detection algorithm** — section 10 leaves this
  explicitly undefined ("depends on how you detect the zones"); this change needs a
  real, causal, reproducible answer. New record. Task 0.2.
- **A test runner for `apps/api`** — none exists in this monorepo yet, and this module
  is the first piece of the backend that is pure computation, verifiable only by unit
  test until T11-14 exist. New record. Task 0.3.

## What Changes

- New `apps/api/src/indicator/` module: `IndicatorPort` (abstract, DI token),
  `IndicatorService` (the only implementation — in-memory cache keyed by `(datasetId,
  indicator name, params)`, dispatch on `DataRequest.source`), and one calculator per
  indicator (MA, RSI, Bollinger, Support/Resistance) behind a small registry.
- No controller, no DTOs, no wiring into any other module — `IndicatorModule` exports
  `IndicatorPort` for a future consumer to import; nothing does yet.
- `apps/api` gains its first test runner (Jest) and unit tests for every calculator and
  the service.

## Capabilities

### New Capabilities
- `indicator-computation`: causal indicator series (MA, RSI, Bollinger,
  Support/Resistance) computed from candles and cached per dataset/indicator/params,
  addressable through `DataRequest` by a dotted source name.

### Modified Capabilities
(none)

## Impact

- `apps/api/src/indicator/`: `indicator.module.ts`, `indicator.service.ts` (+ spec),
  `ports/indicator.port.ts`, `calculators/{calculator, moving-average, rsi,
  bollinger-bands, support-resistance}.calculator.ts` (+ spec each).
- `apps/api/package.json`: adds `jest`, `ts-jest`, `@types/jest`; new `test` script.
  `apps/api/jest.config.js` (new). `apps/api/tsconfig.build.json` (new) keeps
  `.spec.ts` files out of `dist`.
- `docs/decisions/0028-0030` (new records) + `docs/decisions/README.md` index.
- `openspec/specs/indicator-computation/spec.md` (new capability).
- `packages/contracts/`: **untouched** — `DataRequest`/`StrategyContext` are locked;
  this change works entirely inside the string contract they already define.
- No other module imports this one yet — nothing to wire up until T11-14.
