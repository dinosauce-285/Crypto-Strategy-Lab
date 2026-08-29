import type { LeaderboardEntry, LeaderboardQuery } from '@csl/contracts';

export abstract class RankingPort {
  abstract getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardEntry[]>;
}
