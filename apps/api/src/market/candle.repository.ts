import { Injectable } from '@nestjs/common';
import type { Candle, Timeframe } from '@csl/contracts';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';

/**
 * The only place that touches PrismaService for candles (BACKEND_CONSTRAINT.md). A row
 * here is always closed — a forming candle is never stored, so `closed` on the way out
 * is always true. Only a Dataset's own fetch writes here now (ADR 0040/0041) — a
 * realtime watch never does.
 */
@Injectable()
export class CandleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async upsertMany(candles: Candle[]): Promise<void> {
    if (candles.length === 0) return;
    await this.prisma.$transaction(
      candles.map((candle) => {
        const row = toRow(candle);
        return this.prisma.candle.upsert({
          where: { pair_timeframe_openTime: pick(row) },
          create: row,
          update: row,
        });
      }),
    );
  }

  async range(pair: string, timeframe: Timeframe, options: CandleRangeOptions): Promise<Candle[]> {
    const { limit, from, to } = options;

    if (from !== undefined && to !== undefined) {
      const rows = await this.prisma.candle.findMany({
        where: { pair, timeframe, openTime: { gte: new Date(from), lte: new Date(to) } },
        orderBy: { openTime: 'asc' },
        take: limit,
      });
      return rows.map(toCandle);
    }

    // No range given: today's "most recent N" — the shape CandleChart/RecentTicks
    // already depend on, unchanged.
    const rows = await this.prisma.candle.findMany({
      where: { pair, timeframe },
      orderBy: { openTime: 'desc' },
      take: limit,
    });
    return rows.reverse().map(toCandle);
  }
}

/**
 * Either bound given → a date-range read (ADR 0026), `limit` an optional safety cap.
 * Neither → the existing "most recent `limit`" read, unchanged.
 */
export interface CandleRangeOptions {
  limit?: number;
  from?: number;
  to?: number;
}

function toRow(candle: Candle) {
  return {
    pair: candle.pair,
    timeframe: candle.timeframe,
    openTime: new Date(candle.openTime),
    open: new Prisma.Decimal(candle.open),
    high: new Prisma.Decimal(candle.high),
    low: new Prisma.Decimal(candle.low),
    close: new Prisma.Decimal(candle.close),
    volume: new Prisma.Decimal(candle.volume),
  };
}

function pick(row: ReturnType<typeof toRow>) {
  return { pair: row.pair, timeframe: row.timeframe, openTime: row.openTime };
}

function toCandle(row: {
  pair: string;
  timeframe: string;
  openTime: Date;
  open: Prisma.Decimal;
  high: Prisma.Decimal;
  low: Prisma.Decimal;
  close: Prisma.Decimal;
  volume: Prisma.Decimal;
}): Candle {
  return {
    pair: row.pair,
    timeframe: row.timeframe as Timeframe,
    openTime: row.openTime.getTime(),
    open: row.open.toString(),
    high: row.high.toString(),
    low: row.low.toString(),
    close: row.close.toString(),
    volume: row.volume.toString(),
    closed: true,
  };
}
