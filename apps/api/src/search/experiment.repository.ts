import { Injectable } from '@nestjs/common';
import type { CandidateSpec, Metrics, Trade } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface CompletedRun {
  datasetId: string;
  spec: CandidateSpec;
  specHash: string;
  metrics: Metrics;
  trades: Trade[];
}

/** `spec` is whatever came off the queue: a run can fail by not being a specification at all. */
export interface FailedRun {
  datasetId: string;
  spec: unknown;
  specHash: string;
  error: string;
}

const UNIQUE_VIOLATION = 'P2002';
const FOREIGN_KEY_VIOLATION = 'P2003';

const asJson = (spec: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(spec) ?? 'null') as Prisma.InputJsonValue;

/** The only place this module touches the database — the layering rule of BACKEND_CONSTRAINT. */
@Injectable()
export class ExperimentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async isRecorded(datasetId: string, specHash: string): Promise<boolean> {
    const found = await this.prisma.experiment.findUnique({
      where: { datasetId_specHash: { datasetId, specHash } },
      select: { id: true },
    });
    return found !== null;
  }

  /** Returns the new experiment's id, or null when another worker recorded it first. */
  async recordCompleted(run: CompletedRun): Promise<string | null> {
    try {
      const experiment = await this.prisma.experiment.create({
        data: {
          datasetId: run.datasetId,
          spec: asJson(run.spec),
          specHash: run.specHash,
          status: 'completed',
          totalReturn: run.metrics.totalReturn,
          profitLoss: run.metrics.profitLoss,
          winRate: run.metrics.winRate,
          tradeCount: run.metrics.tradeCount,
          maxDrawdown: run.metrics.maxDrawdown,
          profitFactor: run.metrics.profitFactor,
          sharpeRatio: run.metrics.sharpeRatio,
          trades: {
            create: run.trades.map((trade, index) => ({
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
  }

  /**
   * A permanent failure is a row, not a log line — section 32.7 counts from the table
   * (ADR 0007). Returns false when there is nothing to attach the row to, which leaves the
   * run's own counter as the only record of it.
   */
  async recordFailed(run: FailedRun): Promise<boolean> {
    try {
      await this.prisma.experiment.create({
        data: {
          datasetId: run.datasetId,
          spec: asJson(run.spec),
          specHash: run.specHash,
          status: 'failed',
          error: run.error,
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
