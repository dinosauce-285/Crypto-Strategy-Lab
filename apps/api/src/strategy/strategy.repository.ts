import { Injectable } from '@nestjs/common';
import type { StrategyMeta } from '@csl/contracts';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const UNIQUE_VIOLATION = 'P2002';

@Injectable()
export class StrategyRepository {
  constructor(private readonly prisma: PrismaService) {}

  async registerAll(metas: readonly StrategyMeta[]): Promise<void> {
    for (const meta of metas) {
      await this.register(meta);
    }
  }

  private async register(meta: StrategyMeta): Promise<void> {
    const found = await this.prisma.strategy.findUnique({
      where: { strategyId_version: { strategyId: meta.id, version: meta.version } },
      select: { strategyId: true },
    });
    if (found) return;

    try {
      await this.prisma.strategy.create({
        data: {
          strategyId: meta.id,
          version: meta.version,
          name: meta.name,
          group: meta.group,
          warmup: meta.warmup,
          params: asJson(meta.params),
        },
        select: { strategyId: true },
      });
    } catch (error) {
      if (!isCode(error, UNIQUE_VIOLATION)) throw error;
    }
  }
}

const asJson = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value) ?? 'null') as Prisma.InputJsonValue;

const isCode = (error: unknown, code: string): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === code;

