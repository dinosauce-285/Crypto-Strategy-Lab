import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { DomainErrorFilter } from './http/domain-error.filter';
import { ChannelIoAdapter } from './realtime/channel-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  const webOrigin = config.get('WEB_ORIGIN', 'http://localhost:5173');

  app.setGlobalPrefix('api');
  app.enableCors({ origin: webOrigin });
  app.useGlobalFilters(new DomainErrorFilter());
  app.useWebSocketAdapter(new ChannelIoAdapter(app, webOrigin));

  const port = config.get<number>('API_PORT', 3001);
  await app.listen(port);
  new Logger('bootstrap').log(`API listening on http://localhost:${port}/api`);
}

void bootstrap();
