import { Injectable } from '@nestjs/common';
import type { Dataset, Timeframe } from '@csl/contracts';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

type DatasetRow = Prisma.DatasetModel;

export interface CreateDatasetResult {
  dataset: Dataset;
  /** False when `create` matched an existing row instead of inserting one (ADR 0041's dedupe-by-key). */
  created: boolean;
}

@Injectable()
export class DatasetRepository {
  constructor(private readonly prisma: PrismaService) {}

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
    const key = {
      pair: data.pair,
      timeframe: data.timeframe,
      from: new Date(data.from),
      to: new Date(data.to),
      entryPrice: data.rules.entryPrice,
      feeRate: data.rules.feeRate,
      warmupCandles: data.rules.warmupCandles,
      profitMode: data.rules.profitMode,
      drawdownMode: data.rules.drawdownMode,
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
