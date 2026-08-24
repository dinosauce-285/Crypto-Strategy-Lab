## MODIFIED Requirements

### Requirement: Creating a Dataset fetches its own candle range

The system SHALL fetch candles for a Dataset's pair, timeframe and declared `from`/`to`
range from the exchange, and SHALL persist them before the Dataset is considered to
exist. A Dataset SHALL NOT be created against a range that has not been fetched. The
fetch SHALL run as a background job rather than blocking the creation request — the
caller SHALL receive an identifier for the in-progress attempt immediately, and SHALL
learn of completion or failure by observing that attempt's progress (see "A caller can
observe a Dataset's fetch progress"), not by the original request remaining open until
the fetch finishes.

#### Scenario: A range within a single exchange page

- **WHEN** a Dataset creation request is made for a range covering 1000 or fewer
  candles at its timeframe
- **THEN** the system accepts the request immediately and fetches that range from the
  exchange in one request as a background job
- **AND** the candles are stored, and the Dataset considered to exist, only once that
  job completes

#### Scenario: A range spanning multiple exchange pages

- **WHEN** a Dataset creation request is made for a range covering more than 1000
  candles at its timeframe
- **THEN** the system accepts the request immediately and fetches the range across
  multiple paginated requests as a background job
- **AND** every candle in the declared range is stored, deduplicated by pair,
  timeframe and open time, before the Dataset is considered to exist

### Requirement: A failed fetch fails the Dataset creation visibly

If the exchange cannot be reached, or repeatedly rejects requests, the Dataset
creation attempt SHALL end in a visible failure rather than a Dataset backed by
incomplete or absent data. Since the fetch runs as a background job, that failure
SHALL be visible through the same progress observation the caller used to watch the
attempt, not as a synchronous error from the original creation request.

#### Scenario: The exchange is unreachable

- **WHEN** a Dataset creation attempt is in progress and the exchange cannot be
  reached
- **THEN** the attempt ends in a failure the caller can observe
- **AND** no Dataset row referencing an unfetched range is left for the caller to use

#### Scenario: Retrying after a failure succeeds

- **WHEN** a Dataset creation attempt previously failed
- **AND** the same pair, timeframe, and range is submitted again
- **THEN** the system fetches and stores the range as normal
- **AND** any candles already stored from the earlier attempt are not duplicated

## ADDED Requirements

### Requirement: A caller can observe a Dataset's fetch progress

While a Dataset creation attempt's background fetch is running, the system SHALL let
the caller observe how much of the declared range has been fetched so far, until the
attempt completes or fails. This SHALL NOT require the caller to poll — the system
SHALL push progress as it happens.

#### Scenario: Progress advances as chunks are fetched

- **WHEN** a Dataset creation attempt's background fetch completes one of several
  paginated chunks
- **THEN** an observer of that attempt sees the fetched-so-far count advance
- **AND** the observer is not required to poll for the update

#### Scenario: An observer learns of completion

- **WHEN** a Dataset creation attempt's background fetch finishes successfully
- **THEN** an observer of that attempt is told it is complete
- **AND** the observer can retrieve the resulting Dataset

#### Scenario: An observer learns of failure

- **WHEN** a Dataset creation attempt's background fetch fails
- **THEN** an observer of that attempt is told it failed
- **AND** no partial progress is presented as if the attempt had succeeded
