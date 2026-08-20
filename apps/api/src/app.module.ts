import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { RealtimeModule } from './realtime/realtime.module';
import { MarketModule } from './market/market.module';
import { SearchModule } from './search/search.module';

/**
 * Module boundaries are the architecture (see AGENTS.md). A module can only reach
 * what another module explicitly exports, so the one-way dependency rule is
 * enforced by the framework rather than by code review.
 *
 * EventEmitterModule is the in-process bus from ADR 0003 — publishers and
 * subscribers find each other by event name, never by importing one another.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    PrismaModule,
    HealthModule,
    RealtimeModule,
    MarketModule,
    SearchModule,
  ],
})
export class AppModule {}
