import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import type { Dataset } from '@csl/contracts';
import { BacktestService } from './backtest.service';
import { InvalidDatasetError, validateDataset } from './dataset-validator';
import type { SingleRunRequestDto, SingleRunResponseDto } from './dto/single-run.dto';
import { InvalidSpecError } from './spec-validator';
import { UnknownStrategyError } from './ports/strategy-factory.port';

@Controller()
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Get('datasets')
  listDatasets(): Promise<Dataset[]> {
    return this.backtestService.listDatasets();
  }

  @Get('datasets/:id')
  getDataset(@Param('id') id: string): Promise<Dataset> {
    return this.backtestService.getDataset(id);
  }

  @Post('datasets')
  createDataset(@Body() body: unknown): Promise<Dataset> {
    return this.backtestService.createDataset(validateDataset(body));
  }

  @Delete('datasets/:id')
  deleteDataset(@Param('id') id: string): Promise<Dataset> {
    return this.backtestService.deleteDataset(id);
  }

  @Post('backtest/run')
  async runBacktest(@Body() body: SingleRunRequestDto): Promise<SingleRunResponseDto> {
    try {
      return await this.backtestService.runSingle(body);
    } catch (error) {
      if (error instanceof InvalidSpecError) throw new BadRequestException(error.message);
      if (error instanceof UnknownStrategyError) throw new BadRequestException(error.message);
      if (error instanceof InvalidDatasetError) throw new BadRequestException(error.message);
      throw error;
    }
  }
}
