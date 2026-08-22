import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { StrategyModule } from '../strategy/strategy.module';
import { BacktestProcessor } from './backtest.processor';
import { BacktestWorker } from './backtest.worker';
import { ExperimentRepository } from './experiment.repository';

/**
 * What a worker process boots: the queue consumer, the pipeline it runs, and the database.
 * No HTTP server, no gateway, no event bus — a worker notifies nobody, it returns a value
 * through the queue and the API turns that into the events of section 34.
 *
 * BacktestRunner and RunEvaluator are still absent until T12 and T13 bind them. A
 * candidate reaches the strategy factory now, then fails permanently at the next owed port.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, StrategyModule],
  providers: [ExperimentRepository, BacktestProcessor, BacktestWorker],
})
export class BacktestWorkerModule {}
