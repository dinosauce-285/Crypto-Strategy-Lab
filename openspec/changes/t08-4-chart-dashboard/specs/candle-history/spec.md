## ADDED Requirements

### Requirement: A user views several timeframes of one pair at once

The system SHALL display 4 charts for one pair simultaneously, each showing its own
timeframe, and SHALL let each chart's timeframe be changed independently of the other
three. The default layout SHALL be `5m` and `15m` on the first row, `1h` and `4h` on
the second.

#### Scenario: Default layout on load

- **WHEN** a user opens the dashboard
- **THEN** four charts are shown for the selected pair
- **AND** their timeframes read, in order, `5m`, `15m`, `1h`, `4h`

#### Scenario: Changing one chart's timeframe does not affect the others

- **WHEN** a user changes one chart's timeframe
- **THEN** that chart now shows the new timeframe
- **AND** the other three charts keep showing their own timeframe unchanged

#### Scenario: Each chart keeps its own state

- **WHEN** one chart is loading, empty, or erroring
- **THEN** the other three charts are unaffected and show their own state independently
