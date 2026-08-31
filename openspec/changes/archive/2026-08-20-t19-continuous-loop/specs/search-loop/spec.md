## Purpose

The loop that turns candidate strategies into recorded experiments: it pulls candidates
from a generator, spreads their backtests across parallel workers, and stops on a bound it
was given before it started rather than when someone notices it is still running.

## ADDED Requirements

### Requirement: A run declares its bound before it starts

A run SHALL carry at least one bound — a maximum number of candidates, a maximum wall
clock duration, or both. A request to start a run carrying neither SHALL be rejected and
no work SHALL be queued. A run MAY additionally declare a plateau limit: the number of
consecutive finished candidates that may fail to improve the best result before the run
ends.

#### Scenario: A run without a bound is refused

- **WHEN** a run is requested with neither a candidate limit nor a duration limit
- **THEN** the request is rejected
- **AND** nothing is added to the queue

#### Scenario: A bounded run starts

- **WHEN** a run is requested with a limit of 200 candidates
- **THEN** the run starts
- **AND** it reports itself as running

### Requirement: A run ends at the first bound it reaches and says which one

A run SHALL end as soon as any one of its bounds is met, and SHALL report the reason it
ended: the candidate limit, the duration limit, the plateau limit, a source with nothing
left to give, or a manual stop. Once ended, a run SHALL queue no further candidates.

#### Scenario: The candidate limit is reached

- **WHEN** a run bounded at 200 candidates has finished its 200th
- **THEN** the run ends with the reason "candidates"
- **AND** no further candidate is queued

#### Scenario: The duration limit is reached

- **WHEN** a run bounded at ten minutes passes ten minutes
- **THEN** the run ends with the reason "duration"
- **AND** candidates already accepted for work are allowed to finish

#### Scenario: The source runs dry

- **WHEN** the candidate source returns nothing further
- **THEN** the run ends with the reason "exhausted"

#### Scenario: No source is registered

- **WHEN** a run is started and no candidate source is registered
- **THEN** the run ends immediately with the reason "exhausted"
- **AND** the run reports zero candidates tried

#### Scenario: No improvement for the plateau limit

- **WHEN** a run declaring a plateau limit of 50 finishes 50 consecutive candidates without beating its best result
- **THEN** the run ends with the reason "plateau"

### Requirement: Candidates are tested through a queue, in parallel, outside the request

A candidate SHALL be tested by a worker consuming a durable queue, never inside the
request that started the run. Several candidates SHALL be able to be in progress at once,
and workers SHALL be able to run as more than one process.

#### Scenario: Starting a run returns before the work is done

- **WHEN** a run is started
- **THEN** the request returns immediately with the run's identity
- **AND** the candidates are tested afterwards

#### Scenario: Two workers share the work

- **WHEN** two worker processes are running and a run queues candidates
- **THEN** both take candidates from the same queue
- **AND** no candidate is taken by both

### Requirement: A run can be paused, resumed and stopped

Pausing a run SHALL prevent further candidates being taken from the queue while allowing
those already in progress to finish, and SHALL survive being requested from a process
other than the one running the workers. Resuming SHALL continue the same run against the
same bounds, counting the time it was paused as elapsed. Stopping SHALL end the run and
discard candidates still waiting.

#### Scenario: Pause holds the queue

- **WHEN** a running run is paused
- **THEN** no waiting candidate is started
- **AND** a candidate already being tested is allowed to finish and is recorded

#### Scenario: Resume continues the same run

- **WHEN** a paused run is resumed
- **THEN** waiting candidates start again
- **AND** the run's counters continue from where they were

#### Scenario: Stop discards what is waiting

- **WHEN** a running run is stopped
- **THEN** the run ends with the reason "stopped"
- **AND** candidates still waiting in the queue are discarded

### Requirement: A failing candidate is retried only when retrying could help

A candidate whose failure cannot change on a second attempt — a specification the
validator rejects, a member strategy that is not registered, a dataset that does not
exist — SHALL be failed permanently on the first attempt and SHALL NOT be retried. Any
other failure SHALL be retried a bounded number of times before being treated as
permanent. No failure SHALL be retried without limit.

#### Scenario: A malformed specification is not retried

- **WHEN** a candidate whose member weights do not sum to 1 is taken by a worker
- **THEN** it fails on the first attempt
- **AND** it is not attempted again

#### Scenario: An unknown strategy is not retried

- **WHEN** a candidate names a strategy that is not registered
- **THEN** it fails on the first attempt
- **AND** it is not attempted again

#### Scenario: A transient failure is retried

- **WHEN** a candidate fails because the database connection dropped
- **THEN** it is attempted again
- **AND** after its attempts are exhausted it is treated as permanently failed

### Requirement: A permanently failed candidate is recorded, not dropped

A candidate that has failed permanently SHALL be written as a failed experiment carrying
the reason, so that the number of failed candidates is a fact in the database rather than
a line in a log. A failed experiment SHALL carry no metrics.

#### Scenario: A failure is stored

- **WHEN** a candidate fails permanently
- **THEN** an experiment row exists for that candidate and dataset with status "failed"
- **AND** it carries the reason it failed
- **AND** it carries no metrics

#### Scenario: A failure that cannot be attributed

- **WHEN** a job fails permanently and carries no usable dataset to record it against
- **THEN** it is still counted in the run's failed total

### Requirement: A candidate already tested on a dataset is not tested again

Before running a backtest, a worker SHALL determine whether that specification has already
been recorded against that dataset, and SHALL skip it if so. Identity SHALL be a hash of
the specification in a canonical form, so that two spellings of the same candidate are one
candidate.

#### Scenario: A duplicate is skipped

- **WHEN** a candidate is queued whose specification is already recorded against that dataset
- **THEN** no backtest is run for it
- **AND** it is counted as a duplicate rather than as a failure

#### Scenario: The same candidate on a different dataset

- **WHEN** a candidate already recorded against one dataset is queued against another
- **THEN** it is tested

#### Scenario: Reordered members are the same candidate

- **WHEN** two candidates hold the same members, weights, threshold and rule in a different order
- **THEN** they produce the same identity
- **AND** the second is skipped as a duplicate

### Requirement: A run answers the five questions of section 32.7

While a run exists it SHALL report, on request: whether it is running, paused or ended;
how many candidates have been tried; how long a backtest is taking on average; how many
candidates failed; and the identity of the best result so far.

#### Scenario: Status while running

- **WHEN** the status of a running run is requested
- **THEN** it reports the run as running
- **AND** it reports the number tried, the number failed, the number waiting and the average backtest duration

#### Scenario: Status before any candidate finishes

- **WHEN** the status is requested before any candidate has finished
- **THEN** it reports zero tried
- **AND** it reports no average duration rather than a duration of zero

### Requirement: Progress is pushed to whoever is watching

A run SHALL publish its progress on the push channel under a topic of its own, so a screen
watching a run is not required to poll for it. The published message SHALL carry the same
counters the status reports.

#### Scenario: A watcher receives progress

- **WHEN** a client subscribes to a run's topic and a candidate finishes
- **THEN** the client receives a message carrying the run's counters

#### Scenario: A run that ends says so on the topic

- **WHEN** a run ends for any reason
- **THEN** a final message is published carrying the reason it ended

### Requirement: Work does not outlive the run that ordered it

Candidates queued by a run SHALL NOT be processed by a later run. Jobs left in the queue
by a process that is no longer running SHALL be discarded before a new run starts, so that
every candidate tested belongs to a run with a live bound.

#### Scenario: Orphaned jobs are cleared

- **WHEN** the API is restarted while candidates are still waiting in the queue
- **AND** a new run is started
- **THEN** the candidates left by the previous process are not tested
- **AND** the new run's counters count only its own candidates
