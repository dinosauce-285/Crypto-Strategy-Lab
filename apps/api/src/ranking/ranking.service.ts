import { Injectable } from '@nestjs/common';
import type { CandidateSpec, LeaderboardEntry, LeaderboardQuery, Metrics } from '@csl/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { computeOverallScore, SCORE_FORMULA_VERSION } from './score.calculator';
import { RankingPort } from './ports/ranking.port';

@Injectable()
export class RankingService extends RankingPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardEntry[]> {
    if (!query.datasetId) {
      return [];
    }

    const rows = await this.prisma.experiment.findMany({
      where: {
        datasetId: query.datasetId,
        status: 'completed',
      },
    });

    const evaluated = rows.map((row) => {
      const metrics: Metrics = {
        totalReturn: row.totalReturn ?? 0,
        profitLoss: row.profitLoss?.toString() ?? '0',
        winRate: row.winRate ?? 0,
        tradeCount: row.tradeCount ?? 0,
        maxDrawdown: row.maxDrawdown ?? 0,
        profitFactor: row.profitFactor !== null && row.profitFactor !== undefined ? row.profitFactor : undefined,
        sharpeRatio: row.sharpeRatio !== null && row.sharpeRatio !== undefined ? row.sharpeRatio : undefined,
      };

      const score = computeOverallScore(metrics);

      return {
        id: row.id,
        datasetId: row.datasetId,
        spec: row.spec as unknown as CandidateSpec,
        specHash: row.specHash,
        metrics,
        score,
        createdAt: row.createdAt.getTime(),
      };
    });

    const sortBy = query.sortBy ?? 'score';
    const direction = query.direction ?? (sortBy === 'maxDrawdown' ? 'asc' : 'desc');

    evaluated.sort((a, b) => {
      let valA: number;
      let valB: number;

      switch (sortBy) {
        case 'totalReturn':
          valA = a.metrics.totalReturn;
          valB = b.metrics.totalReturn;
          break;
        case 'winRate':
          valA = a.metrics.winRate;
          valB = b.metrics.winRate;
          break;
        case 'maxDrawdown':
          valA = a.metrics.maxDrawdown;
          valB = b.metrics.maxDrawdown;
          break;
        case 'sharpeRatio':
          valA = a.metrics.sharpeRatio ?? -999;
          valB = b.metrics.sharpeRatio ?? -999;
          break;
        case 'tradeCount':
          valA = a.metrics.tradeCount;
          valB = b.metrics.tradeCount;
          break;
        case 'score':
        default:
          valA = a.score;
          valB = b.score;
          break;
      }

      if (direction === 'asc') {
        return valA - valB || b.createdAt - a.createdAt;
      }
      return valB - valA || b.createdAt - a.createdAt;
    });

    const limit = Math.max(1, Math.min(query.limit ?? 10, 50));
    const topK = evaluated.slice(0, limit);

    return topK.map((item, index) => ({
      rank: index + 1,
      experimentId: item.id,
      datasetId: item.datasetId,
      spec: item.spec,
      specHash: item.specHash,
      metrics: item.metrics,
      score: item.score,
      scoreFormulaVersion: SCORE_FORMULA_VERSION,
      createdAt: item.createdAt,
    }));
  }
}
