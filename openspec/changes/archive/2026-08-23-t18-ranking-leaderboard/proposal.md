## Why

A core value of the Strategy Lab is discovering and ranking superior strategy combinations. T18 delivers a Top-K ranking table that updates dynamically in real time without page reloads whenever better candidates finish backtesting, allowing users to rank and compare strategies across multiple dimensions (Return, Win Rate, Max Drawdown, Sharpe Ratio, and Overall Score) and inspect any winning candidate directly in the T14 single-run screen (brief sections 21, 22, 33 steps 7-9, 37).

Per ADR 0011, the leaderboard is recomputed on every read from dataset-scoped `Experiment` rows without storing stale ranks or adding premature caches. Per ADR 0010, the board is strictly filtered by dataset so incomparable backtest rules are never mixed.

T18 · [Ranking + Leaderboard](https://trello.com/c/Thien-t18-ranking-leaderboard).
Brief: section 21 (ranking table, sorting by Return/WinRate/MDD/Sharpe, "the team must clearly present the calculation"); section 22 "Top K = 10"; section 37 Leaderboard; section 33 steps 7-9.

## Decisions

**Settled**

- [0010](../../../docs/decisions/0010-dataset-carries-the-backtest-rules.md) — dataset is a record with its own ID carrying the 5 backtest rules; leaderboard queries are strictly scoped to a single dataset to avoid comparing incomparable rules.
- [0011](../../../docs/decisions/0011-leaderboard-is-recomputed.md) — leaderboard is an `ORDER BY ... LIMIT K` query computed dynamically over the `Experiment` records of one dataset on every read without a dedicated table or premature cache.
- [0017](../../../docs/decisions/0017-one-push-channel-addressed-by-topic.md) & [0019](../../../docs/decisions/0019-the-push-channel-runs-on-socket-io.md) — real-time push channel emits `leaderboard:<datasetId>` topic notifications ("the board changed") prompting the UI to re-read.
- [0020](../../../docs/decisions/0020-module-reaches-the-browser-through-ports.md) — ranking port decoupled from web delivery.
- [0025](../../../docs/decisions/0025-tab-navigation-uses-react-router.md) — React Router tab navigation.
- [0035](../../../docs/decisions/0035-metric-evaluation-formulas-for-profit-calculation-modes-draw.md) — metric evaluation formulas.

**To settle**

- `docs/decisions/0036-overall-score-formula-and-trade-count-damping-for-leaderboard.md` — The mathematical composite Overall Score formula combining Return, Win Rate, Max Drawdown, Sharpe Ratio, statistical trade-count confidence damping (penalizing candidates with too few trades to avoid luck-based over-ranking), and formula versioning (`v1`).

## What Changes

- Contracts (`packages/contracts`):
  - Add `LeaderboardEntry`, `LeaderboardSortField`, and `LeaderboardQuery` contracts to `packages/contracts/src/search.ts` or `experiment.ts`.
- Backend (`apps/api`):
  - Implement `RankingCalculator` evaluating composite scores with trade-count damping and versioning (`v1`).
  - Implement `RankingService` and `RankingPort` providing dynamic dataset-scoped sorting and pagination (`Top-K`, default \(K=10\)).
  - Implement `LeaderboardController` exposing `GET /api/leaderboard?datasetId=...&sortBy=...&direction=...&limit=...`.
  - Add event listener for `experiment.completed` that publishes lightweight topic event `leaderboard:<datasetId>` via `ChannelPublisher`.
- Frontend (`apps/web`):
  - Add `LeaderboardScreen.tsx` with dedicated navigation tab in `Navbar.tsx` and route in `App.tsx`.
  - `LeaderboardTable`: Interactive sortable columns (Rank, Recipe/Candidate Spec, Total Return, Win Rate, Max Drawdown, Sharpe Ratio, Trades, Score).
  - Real-time updates: Subscribes to `leaderboard:<datasetId>` topic via `useTopic` hook and seamlessly re-fetches without page reload.
  - Row click interaction: Clicking any leaderboard entry navigates to `/backtest` with the exact candidate configuration pre-loaded in the T14 screen.
  - Full 4-state handling (loading, empty, error, ready) strictly complying with `UI_CONSTRAINT.md`.

## Capabilities

### New Capabilities
- `ranking-leaderboard`: dynamic leaderboard computation on read with multi-column sorting, statistical trade-count confidence damping, real-time push updates on `leaderboard:<datasetId>`, and candidate inspection navigation.

### Modified Capabilities
(none)

## Impact

- `packages/contracts/src/`: shared leaderboard contracts.
- `apps/api/src/ranking/` (or `apps/api/src/search/`): ranking calculation, controller, and event handler.
- `apps/web/src/screens/LeaderboardScreen.tsx`, `apps/web/src/leaderboard/`, `apps/web/src/layout/Navbar.tsx`, `apps/web/src/App.tsx`.
- `docs/decisions/0036-overall-score-formula-and-trade-count-damping-for-leaderboard.md`.
