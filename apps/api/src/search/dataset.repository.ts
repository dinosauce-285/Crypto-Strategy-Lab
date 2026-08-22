import { Injectable } from '@nestjs/common';
import type { Dataset, Timeframe } from '@csl/contracts';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatasetRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<Dataset | null> {
    const row = await this.prisma.dataset.findUnique({
      where: { id },
    });
    if (!row) return null;
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

  async list(): Promise<Dataset[]> {
    const rows = await this.prisma.dataset.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((row) => ({
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
    }));
  }

  async create(data: Omit<Dataset, 'id'>): Promise<Dataset> {
    const fromDate = new Date(data.from);
    const toDate = new Date(data.to);

    const row = await this.prisma.dataset.upsert({
      where: {
        pair_timeframe_from_to_entryPrice_feeRate_warmupCandles_profitMode_drawdownMode: {
          pair: data.pair,
          timeframe: data.timeframe,
          from: fromDate,
          to: toDate,
          entryPrice: data.rules.entryPrice,
          feeRate: data.rules.feeRate,
          warmupCandles: data.rules.warmupCandles,
          profitMode: data.rules.profitMode,
          drawdownMode: data.rules.drawdownMode,
        },
      },
      update: {},
      create: {
        pair: data.pair,
        timeframe: data.timeframe,
        from: fromDate,
        to: toDate,
        entryPrice: data.rules.entryPrice,
        feeRate: data.rules.feeRate,
        warmupCandles: data.rules.warmupCandles,
        profitMode: data.rules.profitMode,
        drawdownMode: data.rules.drawdownMode,
      },
    });

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
}
