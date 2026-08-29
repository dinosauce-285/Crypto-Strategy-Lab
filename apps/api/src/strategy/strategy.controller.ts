import { Controller, Get } from '@nestjs/common';
import type { StrategyMeta } from '@csl/contracts';
import { StrategyRegistry } from './strategy.registry';

@Controller('strategies')
export class StrategyController {
  constructor(private readonly registry: StrategyRegistry) {}

  @Get()
  list(): StrategyMeta[] {
    return this.registry.list();
  }
}
