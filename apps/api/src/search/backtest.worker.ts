import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Worker } from 'bullmq';
import type { BacktestJob } from '@csl/contracts';
import { BACKTEST_QUEUE, createRedis } from './backtest-queue';
import { BacktestProcessor } from './backtest.processor';
import type { JobOutcome } from './job-outcome';

/**
 * Runs in its own process — ADR 0004 chose processes over threads, and the specification
 * shape of ADR 0007 exists because of it. Several of these may run against one queue;
 * concurrency inside one of them is configuration.
 */
@Injectable()
export class BacktestWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BacktestWorker.name);
  private worker?: Worker<BacktestJob, JobOutcome>;

  constructor(
    private readonly config: ConfigService,
    private readonly processor: BacktestProcessor,
  ) {}

  onModuleInit(): void {
    const concurrency = Number(this.config.get('BACKTEST_CONCURRENCY', 4));
    this.worker = new Worker(BACKTEST_QUEUE, (job) => this.processor.process(job), {
      connection: createRedis(this.config, true),
      concurrency,
    });
    this.logger.log(`consuming "${BACKTEST_QUEUE}" with concurrency ${concurrency}`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.worker?.close();
  }
}
