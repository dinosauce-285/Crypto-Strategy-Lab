import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { StrategyController } from './strategy.controller';
import { StrategyFactory } from '../search/ports/strategy-factory.port';
import { StrategyFactoryService } from './strategy-factory.service';
import { StrategyRegistry } from './strategy.registry';
import { StrategyRepository } from './strategy.repository';

@Module({
  imports: [PrismaModule],
  controllers: [StrategyController],
  providers: [
    StrategyRepository,
    StrategyRegistry,
    { provide: StrategyFactory, useClass: StrategyFactoryService },
  ],
  exports: [StrategyRegistry, StrategyFactory],
})
export class StrategyModule {}

