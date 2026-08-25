import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
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

import { EvaluationModule } from '../evaluation/evaluation.module';
import { RunEvaluator } from './ports/run-evaluator.port';
import { SearchRunEvaluatorService } from './search-run-evaluator.service';

/**
 * What a worker process boots: the queue consumer, the pipeline it runs, and the database.
 * No HTTP server and no gateway: the API turns queue outcomes into browser events.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    PrismaModule,
    StrategyModule,
    MarketModule,
    IndicatorModule,
    EvaluationModule,
  ],
  providers: [
    ExperimentRepository,
    DatasetRepository,
    { provide: BacktestRunner, useClass: BacktestRunnerService },
    { provide: RunEvaluator, useClass: SearchRunEvaluatorService },
    BacktestProcessor,
    BacktestWorker,
  ],
})
export class BacktestWorkerModule {}
