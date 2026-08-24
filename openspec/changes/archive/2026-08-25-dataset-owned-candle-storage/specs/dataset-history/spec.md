## Purpose

Guarantees that creating a Dataset produces a real, complete candle history for the
exact pair, timeframe and date range it declares, fetched from the exchange on demand
rather than depending on whatever a Realtime-tab watch happened to already backfill.

## ADDED Requirements

### Requirement: Creating a Dataset fetches its own candle range

The system SHALL fetch candles for a Dataset's pair, timeframe and declared `from`/`to`
range from the exchange at creation time, and SHALL persist them before the Dataset is
returned to the caller. A Dataset SHALL NOT be created against a range that has not
been fetched.

#### Scenario: A range within a single exchange page

- **WHEN** a Dataset is created for a range covering 1000 or fewer candles at its
  timeframe
- **THEN** the system fetches that range from the exchange in one request
- **AND** the candles are stored before the Dataset is returned

#### Scenario: A range spanning multiple exchange pages

- **WHEN** a Dataset is created for a range covering more than 1000 candles at its
  timeframe
- **THEN** the system fetches the range across multiple paginated requests
- **AND** every candle in the declared range is stored, deduplicated by pair,
  timeframe and open time

### Requirement: A failed fetch fails the Dataset creation visibly

If the exchange cannot be reached, or repeatedly rejects requests, Dataset creation
SHALL fail with an error rather than returning a Dataset backed by incomplete or
absent data.

#### Scenario: The exchange is unreachable

- **WHEN** a Dataset creation request is made and the exchange cannot be reached
- **THEN** the request fails with an error
- **AND** no Dataset row referencing an unfetched range is left for the caller to use

#### Scenario: Retrying after a failure succeeds

- **WHEN** a Dataset creation request previously failed
- **AND** the same pair, timeframe, and range is submitted again
- **THEN** the system fetches and stores the range as normal
- **AND** any candles already stored from the earlier attempt are not duplicated
