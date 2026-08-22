import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StrategyFactory } from '../search/ports/strategy-factory.port';
import { StrategyFactoryService } from './strategy-factory.service';
import { StrategyRegistry } from './strategy.registry';
import { StrategyRepository } from './strategy.repository';

@Module({
  imports: [PrismaModule],
  providers: [
    StrategyRepository,
    StrategyRegistry,
    { provide: StrategyFactory, useClass: StrategyFactoryService },
  ],
  exports: [StrategyRegistry, StrategyFactory],
})
export class StrategyModule {}

