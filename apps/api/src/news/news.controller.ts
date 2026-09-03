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
import { NewsService } from './news.service';
import type { GetNewsResponseDto } from './dto/get-news.dto';
import type { CollectNewsDto, CollectNewsResponseDto } from './dto/collect-news.dto';

const MAX_LIMIT = 1000;

@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  @Get()
  async getNews(
    @Query('coin') coin?: string,
    @Query('source') source?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<GetNewsResponseDto> {
    const parsedFrom =
      from !== undefined ? parseNonNegativeInteger(from, 'from', 'epoch milliseconds') : undefined;
    const parsedTo =
      to !== undefined ? parseNonNegativeInteger(to, 'to', 'epoch milliseconds') : undefined;

    if (parsedFrom !== undefined && parsedTo !== undefined && parsedFrom > parsedTo) {
      throw new BadRequestException('from must not be after to');
    }

    const parsedLimit = limit !== undefined ? parsePositiveInteger(limit, 'limit') : undefined;
    const parsedOffset =
      offset !== undefined ? parseNonNegativeInteger(offset, 'offset') : undefined;

    return this.newsService.getNews({
      coin: coin ? coin.trim() : undefined,
      source: source && source !== 'ALL' ? source.trim() : undefined,
      from: parsedFrom,
      to: parsedTo,
      limit: parsedLimit !== undefined ? Math.min(parsedLimit, MAX_LIMIT) : undefined,
      offset: parsedOffset,
    });
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<NewsItem> {
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('id is required');
    }
    const item = await this.newsService.getById(id);
    if (!item) {
      throw new NotFoundException('Không tìm thấy bài viết này.');
    }
    return item;
  }

  @Post('collect')
  async collect(@Body() body?: CollectNewsDto): Promise<CollectNewsResponseDto> {
    if (body) {
      if (body.source !== undefined && typeof body.source !== 'string') {
        throw new BadRequestException('source must be a string');
      }
      if (
        body.coins !== undefined &&
        (!Array.isArray(body.coins) || body.coins.some((c) => typeof c !== 'string'))
      ) {
        throw new BadRequestException('coins must be an array of strings');
      }
      if (
        body.from !== undefined &&
        (typeof body.from !== 'number' || !Number.isInteger(body.from) || body.from < 0)
      ) {
        throw new BadRequestException('from must be a non-negative integer (epoch milliseconds)');
      }
      if (
        body.to !== undefined &&
        (typeof body.to !== 'number' || !Number.isInteger(body.to) || body.to < 0)
      ) {
        throw new BadRequestException('to must be a non-negative integer (epoch milliseconds)');
      }
      if (body.from !== undefined && body.to !== undefined && body.from > body.to) {
        throw new BadRequestException('from must not be after to');
      }
      if (
        body.limit !== undefined &&
        (typeof body.limit !== 'number' || !Number.isInteger(body.limit) || body.limit <= 0)
      ) {
        throw new BadRequestException('limit must be a positive integer');
      }
    }

    return this.newsService.collect(body);
  }
}

function parseNonNegativeInteger(value: string, name: string, suffix?: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    const extra = suffix ? ` (${suffix})` : '';
    throw new BadRequestException(`${name} must be a non-negative integer${extra}`);
  }
  return parsed;
}

function parsePositiveInteger(value: string, name: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new BadRequestException(`${name} must be a positive integer`);
  }
  return parsed;
}
