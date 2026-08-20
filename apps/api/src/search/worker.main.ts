import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { BacktestWorkerModule } from './backtest-worker.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(BacktestWorkerModule);
  app.enableShutdownHooks();
  new Logger('worker').log('backtest worker started');
}

void bootstrap();
