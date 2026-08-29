## 0. Decisions

- [x] 0.1 docs/decisions/0036-overall-score-formula-and-trade-count-damping-for-leaderboard.md — the mathematical composite overall score formula combining return, win rate, max drawdown, Sharpe ratio, and statistical trade-count confidence damping

## 1. Contracts & Ranking Engine

- [x] 1.1 Add Leaderboard types in `packages/contracts` (`LeaderboardEntry`, `LeaderboardSortField`, `LeaderboardQuery`)
- [x] 1.2 Implement `ScoreCalculator` computing composite scores with trade-count damping and versioning (`v1`)
- [x] 1.3 Implement `RankingRepository` and `RankingService` in `apps/api/src/ranking/` computing dynamic dataset-scoped leaderboard on read
- [x] 1.4 Implement `LeaderboardController` exposing `GET /api/leaderboard` and experiment completion event listener publishing `leaderboard:<datasetId>` topic updates
- [x] 1.5 Add unit tests for `ScoreCalculator`, `RankingService`, and `LeaderboardController`

## 2. Frontend Leaderboard Screen & Navigation

- [x] 2.1 Implement `LeaderboardTable` with sortable column headers, rank badges, score display, and candidate recipe summaries
- [x] 2.2 Wire real-time push subscription using `useTopic` for `leaderboard:<datasetId>` to update board dynamically without page reload
- [x] 2.3 Implement click-to-inspect interaction navigating from leaderboard row to `BacktestScreen` (`/backtest`)
- [x] 2.4 Add `LeaderboardScreen` and register `/leaderboard` route and `Navbar` icon

## 3. Verification & Quality Gates

- [x] 3.1 Verify UI token compliance with `pnpm --dir apps/web lint:ui`
- [x] 3.2 Verify full quality gates (`pnpm lint`, `pnpm --dir apps/api exec tsc --noEmit`, `pnpm --dir apps/web build`, and `pnpm build`)
