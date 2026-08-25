import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Dataset } from '@csl/contracts';
import { BacktestService } from './backtest.service';
import { validateDataset } from './dataset-validator';
import type { SingleRunRequestDto, SingleRunResponseDto } from './dto/single-run.dto';

@Controller()
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Get('datasets')
  listDatasets(): Promise<Dataset[]> {
    return this.backtestService.listDatasets();
  }

  @Post('datasets')
  createDataset(@Body() body: unknown): Promise<Dataset> {
    const validated = validateDataset(body);
    return this.backtestService.createDataset(validated);
  }

  @Post('backtest/run')
  runBacktest(@Body() body: SingleRunRequestDto): Promise<SingleRunResponseDto> {
    return this.backtestService.runSingle(body);
  }
}
