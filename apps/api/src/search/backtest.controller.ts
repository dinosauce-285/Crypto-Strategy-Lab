import { Body, Controller, Get, Post } from '@nestjs/common';
import type { Dataset } from '@csl/contracts';
import { BacktestService } from './backtest.service';
import type { SingleRunRequestDto, SingleRunResponseDto } from './dto/single-run.dto';

@Controller()
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Get('datasets')
  listDatasets(): Promise<Dataset[]> {
    return this.backtestService.listDatasets();
  }

  @Post('datasets')
  createDataset(@Body() body: Omit<Dataset, 'id'>): Promise<Dataset> {
    return this.backtestService.createDataset(body);
  }

  @Post('backtest/run')
  runBacktest(@Body() body: SingleRunRequestDto): Promise<SingleRunResponseDto> {
    return this.backtestService.runSingle(body);
  }
}
