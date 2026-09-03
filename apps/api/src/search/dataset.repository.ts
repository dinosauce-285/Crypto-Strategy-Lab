import { Injectable, type OnModuleInit } from '@nestjs/common';
import type { Dataset, Timeframe } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DATASET_LEASE_MS } from '../prisma/dataset-lease-policy';
import { validateDataset } from './dataset-validator';

type DatasetRow = Prisma.DatasetModel;

export interface CreateDatasetResult {
  dataset: Dataset;
  /** False when `create` matched an existing row instead of inserting one (ADR 0041's dedupe-by-key). */
  created: boolean;
}

export type DeleteDatasetResult =
  | { kind: 'deleted'; dataset: Dataset }
  | { kind: 'not-found' }
  | { kind: 'in-use' };

const NOT_FOUND_CODE = 'P2025';
const FOREIGN_KEY_VIOLATION_CODE = 'P2003';

@Injectable()
export class DatasetRepository implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit(): Promise<void> {
    await this.removeExpiredLeases();
  }

  async findById(id: string): Promise<Dataset | null> {
    const row = await this.prisma.dataset.findUnique({
      where: { id },
    });
    return row ? toDataset(row) : null;
  }

  async list(): Promise<Dataset[]> {
    const rows = await this.prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(toDataset);
  }

  async create(data: Omit<Dataset, 'id'>): Promise<CreateDatasetResult> {
    const validated = validateDataset(data);
    const key = {
      pair: validated.pair,
      timeframe: validated.timeframe,
      from: new Date(validated.from),
      to: new Date(validated.to),
      entryPrice: validated.rules.entryPrice,
      feeRate: validated.rules.feeRate,
      warmupCandles: validated.rules.warmupCandles,
      profitMode: validated.rules.profitMode,
      drawdownMode: validated.rules.drawdownMode,
    };

    const existing = await this.prisma.dataset.findUnique({
      where: { pair_timeframe_from_to_entryPrice_feeRate_warmupCandles_profitMode_drawdownMode: key },
    });

    const row = await this.prisma.dataset.upsert({
      where: { pair_timeframe_from_to_entryPrice_feeRate_warmupCandles_profitMode_drawdownMode: key },
      update: {},
      create: key,
    });

    return { dataset: toDataset(row), created: !existing };
  }

  async delete(id: string): Promise<void> {
    await this.prisma.dataset.delete({ where: { id } });
  }

  async deleteIfUnused(id: string): Promise<DeleteDatasetResult> {
    await this.removeExpiredLeases();
    try {
      const row = await this.prisma.dataset.delete({ where: { id } });
      return { kind: 'deleted', dataset: toDataset(row) };
    } catch (error) {
      if (isCode(error, NOT_FOUND_CODE)) return { kind: 'not-found' };
      if (isCode(error, FOREIGN_KEY_VIOLATION_CODE)) return { kind: 'in-use' };
      throw error;
    }
  }

  async acquireLease(datasetId: string, leaseId: string): Promise<boolean> {
    await this.removeExpiredLeases();
    try {
      await this.prisma.datasetLease.create({
        data: { id: leaseId, datasetId, expiresAt: new Date(Date.now() + DATASET_LEASE_MS) },
      });
      return true;
    } catch (error) {
      if (isCode(error, FOREIGN_KEY_VIOLATION_CODE)) return false;
      throw error;
    }
  }

  async releaseLease(leaseId: string): Promise<void> {
    await this.prisma.datasetLease.deleteMany({ where: { id: leaseId } });
  }

  async renewLease(leaseId: string): Promise<boolean> {
    const renewed = await this.prisma.datasetLease.updateMany({
      where: { id: leaseId },
      data: { expiresAt: new Date(Date.now() + DATASET_LEASE_MS) },
    });
    return renewed.count === 1;
  }

  private async removeExpiredLeases(): Promise<void> {
    await this.prisma.datasetLease.deleteMany({ where: { expiresAt: { lte: new Date() } } });
  }
}

function toDataset(row: DatasetRow): Dataset {
  return {
    id: row.id,
    pair: row.pair,
    timeframe: row.timeframe as Timeframe,
    from: row.from.getTime(),
    to: row.to.getTime(),
    rules: {
      entryPrice: row.entryPrice as 'signal-close' | 'next-open',
      feeRate: row.feeRate.toString(),
      warmupCandles: row.warmupCandles,
      profitMode: row.profitMode as 'simple' | 'compound',
      drawdownMode: row.drawdownMode as 'trade-close' | 'per-candle',
    },
  };
}

const isCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;
