import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StrategyModule } from '../strategy/strategy.module';
import { MarketModule } from '../market/market.module';
import { IndicatorModule } from '../indicator/indicator.module';
import { BacktestProcessor } from './backtest.processor';
import { BacktestWorker } from './backtest.worker';
import { ExperimentRepository } from './experiment.repository';
import { DatasetRepository } from './dataset.repository';
import { BacktestRunner } from './ports/backtest-runner.port';
import { BacktestRunnerService } from './backtest-runner.service';

/**
 * What a worker process boots: the queue consumer, the pipeline it runs, and the database.
 * No HTTP server, no gateway, no event bus — a worker notifies nobody, it returns a value
 * through the queue and the API turns that into the events of section 34.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StrategyModule,
    MarketModule,
    IndicatorModule,
  ],
  providers: [
    ExperimentRepository,
    DatasetRepository,
    { provide: BacktestRunner, useClass: BacktestRunnerService },
    BacktestProcessor,
    BacktestWorker,
  ],
})
export class BacktestWorkerModule {}
