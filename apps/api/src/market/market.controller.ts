import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { TIMEFRAMES, type Timeframe } from '@csl/contracts';
import { MarketService } from './market.service';
import type { GetCandlesResponseDto } from './dto/get-candles.dto';

const MAX_LIMIT = 1000;

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('candles')
  async getCandles(
    @Query('pair') pair: string,
    @Query('timeframe') timeframe: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): Promise<GetCandlesResponseDto> {
    if (!pair) throw new BadRequestException('pair is required');
    if (!isTimeframe(timeframe)) {
      throw new BadRequestException(`timeframe must be one of ${TIMEFRAMES.join(', ')}`);
    }

    if ((from === undefined) !== (to === undefined)) {
      throw new BadRequestException('from and to must be provided together');
    }
    const parsedFrom = from !== undefined ? parseEpoch(from, 'from') : undefined;
    const parsedTo = to !== undefined ? parseEpoch(to, 'to') : undefined;
    if (parsedFrom !== undefined && parsedTo !== undefined && parsedFrom > parsedTo) {
      throw new BadRequestException('from must not be after to');
    }

    const parsedLimit = limit ? Number(limit) : MAX_LIMIT;
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    const clampedLimit = Math.min(parsedLimit, MAX_LIMIT);

    // No range: today's "most recent N" — read live from the exchange, never storage
    // (ADR 0040). A range is still storage-only, unchanged (ADR 0026).
    const candles =
      parsedFrom === undefined
        ? await this.market.getLiveHistory(pair, timeframe, clampedLimit)
        : await this.market.getHistory(pair, timeframe, {
            limit: clampedLimit,
            from: parsedFrom,
            to: parsedTo,
          });
    return { candles };
  }
}

function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}

function parseEpoch(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new BadRequestException(`${name} must be a positive integer (epoch milliseconds)`);
  }
  return parsed;
}
