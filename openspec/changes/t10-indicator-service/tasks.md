## 0. Decisions

- [x] 0.1 [0028](../../../docs/decisions/0028-indicator-series-are-named-by-dotted-source-one-field-per-da.md)
      — dotted `source` naming (`bollinger.upper`, `support-resistance.support`), one
      calculator run and one cache entry shared across an indicator's fields.
- [x] 0.2 [0029](../../../docs/decisions/0029-support-resistance-zones-come-from-causally-confirmed-cluste.md)
      — fractal pivots with a causal confirmation delay, clustered into zones.
- [x] 0.3 [0030](../../../docs/decisions/0030-apps-api-gets-jest-for-unit-tests.md)
      — Jest, NestJS's own default, for `apps/api`'s first test suite.

## 1. Test infrastructure

- [x] 1.1 `apps/api` devDependencies: `jest`, `ts-jest`, `@types/jest`.
- [x] 1.2 `apps/api/jest.config.js` — `ts-jest` preset, `testEnvironment: 'node'`,
      `testMatch: ['**/*.spec.ts']`.
- [x] 1.3 `apps/api/package.json`: `"test": "jest"` script.
- [x] 1.4 `apps/api/tsconfig.build.json` — excludes `**/*.spec.ts` from `nest build`'s
      output, matching Nest CLI's own scaffold convention (not in the original plan;
      added once `nest build` was seen compiling `.spec.ts` into `dist`).

## 2. IndicatorPort and module skeleton

- [x] 2.1 `apps/api/src/indicator/ports/indicator.port.ts` — abstract `IndicatorPort`
      with `compute(datasetId: string, candles: readonly Candle[], request:
      DataRequest): readonly number[]`.
- [x] 2.2 `apps/api/src/indicator/calculators/calculator.ts` — the
      `IndicatorCalculator` contract (`name`, `compute(candles, params):
      Record<string, number[]>`) and a `Map<string, IndicatorCalculator>` registry
      built from the four calculators below.

## 3. Calculators

- [x] 3.1 `moving-average.calculator.ts` — `ma`, `{ period }`, simple moving average,
      `NaN` for `i < period - 1`.
- [x] 3.2 `rsi.calculator.ts` — `rsi`, `{ period }`, Wilder's smoothing on gains/
      losses, `NaN` until `period` deltas exist.
- [x] 3.3 `bollinger-bands.calculator.ts` — `bollinger`, `{ period, stdDevMultiplier =
      2 }`, returns `{ upper, middle, lower }` from one SMA + population-stddev pass,
      `NaN` before `period`.
- [x] 3.4 `support-resistance.calculator.ts` — `support-resistance`, `{ pivotLookback
      = 5, mergeThresholdPct = 0.5 }`, returns `{ support, resistance }` per 0029:
      pivot detection, confirmation delay of `pivotLookback`, clustering within
      `mergeThresholdPct`, nearest-zone lookup per index.
- [x] 3.5 One `.spec.ts` per calculator — hand-computed fixture, warmup `NaN`
      boundary, and a causality property test (`compute(candles.slice(0, N+1))`
      equals the first `N+1` values of `compute(candles)`). 3.4 additionally checks a
      pivot has no effect before `i + pivotLookback`, and that two pivots within
      `mergeThresholdPct` merge into one zone level.

## 4. IndicatorService

- [x] 4.1 `indicator.service.ts` — implements `IndicatorPort`; in-memory
      `Map<string, Record<string, number[]>>` cache keyed by `` `${datasetId}::
      ${name}::${stableParamsKey(params)}` `` (sorted-key JSON of `params`); splits
      `request.source` on the first `.` into `[name, field = 'value']`, looks up the
      calculator, computes on a cache miss, returns `result[field]`.
- [x] 4.2 `indicator.module.ts` — registers `{ provide: IndicatorPort, useClass:
      IndicatorService }`, exports `IndicatorPort`. Not imported anywhere yet.
- [x] 4.3 `indicator.service.spec.ts` — same `(datasetId, source, params)` triple
      returns the same array instance on a second call (cache hit); `bollinger.upper`
      and `bollinger.middle` on identical params share one computed pass (spy/count on
      the calculator); an unregistered indicator name throws.

## 5. Verify

- [x] 5.1 `pnpm --dir apps/api lint`.
- [x] 5.2 `pnpm --dir apps/api exec tsc --noEmit`.
- [x] 5.3 `pnpm --dir apps/api build`.
- [x] 5.4 `pnpm --dir apps/api test` — 5 suites, 22 tests, all passing.
- [x] 5.5 No endpoint/browser check — nothing calls this module yet (see proposal's
      Why); unit tests are the verification until T11-14 exist.

## 6. Close the change

- [ ] 6.1 `pnpm decision --check`.
- [ ] 6.2 `openspec validate t10-indicator-service --strict`.
- [ ] 6.3 `pnpm commit`, push, open a PR.
- [ ] 6.4 Move the Trello card to Done.
