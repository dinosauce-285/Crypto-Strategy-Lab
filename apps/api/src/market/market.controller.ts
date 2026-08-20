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
  ): Promise<GetCandlesResponseDto> {
    if (!pair) throw new BadRequestException('pair is required');
    if (!isTimeframe(timeframe)) {
      throw new BadRequestException(`timeframe must be one of ${TIMEFRAMES.join(', ')}`);
    }

    const parsedLimit = limit ? Number(limit) : MAX_LIMIT;
    if (!Number.isInteger(parsedLimit) || parsedLimit <= 0) {
      throw new BadRequestException('limit must be a positive integer');
    }

    const candles = await this.market.getHistory(pair, timeframe, Math.min(parsedLimit, MAX_LIMIT));
    return { candles };
  }
}

function isTimeframe(value: string): value is Timeframe {
  return (TIMEFRAMES as readonly string[]).includes(value);
}
