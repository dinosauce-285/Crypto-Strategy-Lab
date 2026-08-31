import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import type { NewsItem } from '@csl/contracts';
import { SentimentService } from './sentiment.service';
import type { AnalyzeBatchDto, AnalyzeBatchResponseDto } from './dto/analyze-batch.dto';
import type { SentimentStatsResponseDto } from './dto/sentiment-stats-query.dto';

@Controller('sentiment')
export class SentimentController {
  constructor(private readonly sentimentService: SentimentService) {}

  @Post('analyze/:id')
  async analyzeArticle(@Param('id') id: string): Promise<NewsItem> {
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      throw new BadRequestException('id is required');
    }
    const item = await this.sentimentService.analyzeArticle(id.trim());
    if (!item) {
      throw new NotFoundException(`News item with ID ${id} not found`);
    }
    return item;
  }

  @Post('batch')
  async analyzeBatch(@Body() body?: AnalyzeBatchDto): Promise<AnalyzeBatchResponseDto> {
    if (body) {
      if (
        body.limit !== undefined &&
        (typeof body.limit !== 'number' || !Number.isInteger(body.limit) || body.limit <= 0)
      ) {
        throw new BadRequestException('limit must be a positive integer');
      }
    }
    return this.sentimentService.analyzeBatch(body?.limit);
  }

  @Get('stats')
  async getStats(@Query('coin') coin?: string): Promise<SentimentStatsResponseDto> {
    const trimmedCoin = coin ? coin.trim() : undefined;
    const filterCoin = trimmedCoin && trimmedCoin.length > 0 ? trimmedCoin : undefined;
    return this.sentimentService.getStats(filterCoin);
  }
}
