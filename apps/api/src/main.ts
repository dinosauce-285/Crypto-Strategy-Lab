import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: config.get('WEB_ORIGIN', 'http://localhost:5173') });

  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port);
  new Logger('bootstrap').log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
