import { Injectable } from '@nestjs/common';
import type { CandidateSpec, Metrics, Trade } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DATASET_LEASE_MS } from '../prisma/dataset-lease-policy';
import { DatasetLeaseLostError } from './dataset-lease-lost.error';

export interface CompletedExperimentData {
  datasetId: string;
  spec: CandidateSpec;
  specHash: string;
  metrics: Metrics;
  trades: readonly Trade[];
  leaseId: string;
}

export interface FailedExperimentData {
  datasetId: string;
  spec: unknown;
  specHash: string;
  error: string;
}

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

const asJson = (spec: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(spec) ?? 'null') as Prisma.InputJsonValue;

/**
 * The only place the evaluation module touches the database (BACKEND_CONSTRAINT).
 */
@Injectable()
export class EvaluationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isRecorded(datasetId: string, specHash: string): Promise<boolean> {
    const found = await this.prisma.experiment.findUnique({
      where: { datasetId_specHash: { datasetId, specHash } },
      select: { id: true },
    });
    return found !== null;
  }

  /**
   * Atomically records the completed Experiment and its associated individual Trade records.
   * Returns the created experiment id, or null if already recorded by another worker.
   */
  async recordCompleted(data: CompletedExperimentData): Promise<string | null> {
    return this.prisma.$transaction(async (tx) => {
      const renewed = await tx.datasetLease.updateMany({
        where: { id: data.leaseId, datasetId: data.datasetId, expiresAt: { gt: new Date() } },
        data: { expiresAt: new Date(Date.now() + DATASET_LEASE_MS) },
      });
      if (renewed.count !== 1) throw new DatasetLeaseLostError(data.datasetId);
      try {
        const experiment = await tx.experiment.create({
        data: {
          datasetId: data.datasetId,
          spec: asJson(data.spec),
          specHash: data.specHash,
          status: 'completed',
          totalReturn: data.metrics.totalReturn,
          profitLoss: data.metrics.profitLoss,
          winRate: data.metrics.winRate,
          tradeCount: data.metrics.tradeCount,
          maxDrawdown: data.metrics.maxDrawdown,
          profitFactor: data.metrics.profitFactor ?? null,
          sharpeRatio: data.metrics.sharpeRatio ?? null,
          trades: {
            create: data.trades.map((trade, index) => ({
              seq: index + 1,
              side: trade.side,
              entryTime: new Date(trade.entryTime),
              entryPrice: trade.entryPrice,
              exitTime: new Date(trade.exitTime),
              exitPrice: trade.exitPrice,
              profit: trade.profit,
            })),
          },
        },
        select: { id: true },
      });
        return experiment.id;
      } catch (error) {
        if (isCode(error, UNIQUE_VIOLATION)) return null;
        throw error;
      }
    });
  }

  /**
   * Records a failed experiment row (ADR 0007).
   */
  async recordFailed(data: FailedExperimentData): Promise<boolean> {
    try {
      await this.prisma.experiment.create({
        data: {
          datasetId: data.datasetId,
          spec: asJson(data.spec),
          specHash: data.specHash,
          status: 'failed',
          error: data.error,
        },
        select: { id: true },
      });
      return true;
    } catch (error) {
      if (isCode(error, UNIQUE_VIOLATION) || isCode(error, FOREIGN_KEY_VIOLATION)) return false;
      throw error;
    }
  }
}

const isCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
