import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { BacktestProcessor } from './backtest.processor';
import { BacktestWorker } from './backtest.worker';
import { ExperimentRepository } from './experiment.repository';

/**
 * What a worker process boots: the queue consumer, the pipeline it runs, and the database.
 * No HTTP server, no gateway, no event bus — a worker notifies nobody, it returns a value
 * through the queue and the API turns that into the events of section 34.
 *
 * The three ports the pipeline calls are not provided here. Until T11, T12 and T13 bind
 * them, a candidate fails permanently naming the task that owes it.
 */
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule],
  providers: [ExperimentRepository, BacktestProcessor, BacktestWorker],
})
export class BacktestWorkerModule {}
