## ADDED Requirements

### Requirement: A candle N's value never depends on candle N+1

The system SHALL compute every indicator series so that the value at index N is a
function only of candles at index N and earlier.

#### Scenario: Truncating the candle series does not change earlier values

- **WHEN** an indicator is computed over the first N+1 candles of a dataset
- **AND** the same indicator is computed over the full candle series
- **THEN** the first N+1 values of both series are identical

### Requirement: A value is unavailable until enough candles exist

The system SHALL return `NaN` at any index where an indicator does not yet have enough
preceding candles to produce a value, and SHALL NOT substitute a default or an
extrapolated number.

#### Scenario: Requesting MA before its warmup

- **WHEN** `ma` is requested with `{ period: 20 }` over a candle series shorter than 20
- **THEN** every returned value is `NaN`

### Requirement: A multi-series indicator is addressed by a dotted source per series

The system SHALL expose each series of a multi-series indicator (Bollinger Bands'
`upper`/`middle`/`lower`, Support/Resistance's `support`/`resistance`) as its own
`DataRequest.source`, formed as `<indicator-name>.<field>`, and SHALL compute the
indicator once and share the result across every field requested for the same
parameters.

#### Scenario: Requesting two Bollinger bands for the same parameters

- **WHEN** `bollinger.upper` and `bollinger.middle` are both requested with the same
  `{ period, stdDevMultiplier }` against the same dataset
- **THEN** both requests are served from one computed pass, not two

### Requirement: An indicator result is cached per dataset, indicator and parameters

The system SHALL compute an indicator at most once for a given `(datasetId, indicator
name, params)` triple, and SHALL serve every subsequent request for that same triple
from the cached result.

#### Scenario: The same request is made twice

- **WHEN** `rsi` is requested with `{ period: 14 }` against dataset `D` a second time
- **THEN** the indicator is not recomputed

### Requirement: Support/Resistance zones are built only from confirmed pivots

The system SHALL identify a pivot at index `i` only once `pivotLookback` candles after
`i` exist, and SHALL NOT let a pivot influence the support or resistance series at any
index before `i + pivotLookback`.

#### Scenario: A pivot low forms

- **WHEN** candle `i`'s low is the minimum over the window `[i - pivotLookback, i +
  pivotLookback]`
- **THEN** the support series is unaffected by that pivot at every index before `i +
  pivotLookback`
- **AND** from index `i + pivotLookback` onward, the support series reflects the zone
  that pivot belongs to
