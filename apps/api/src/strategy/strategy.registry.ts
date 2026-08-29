import { Injectable, OnModuleInit } from '@nestjs/common';
import type { StrategyMeta } from '@csl/contracts';
import { registeredStrategies } from './registered-strategies';
import type { StrategyRegistration } from './strategy-registration';
import { StrategyRepository } from './strategy.repository';

@Injectable()
export class StrategyRegistry implements OnModuleInit {
  private readonly strategies: Map<string, StrategyRegistration>;

  constructor(private readonly repository: StrategyRepository) {
    this.strategies = buildRegistry(registeredStrategies);
  }

  async onModuleInit(): Promise<void> {
    await this.repository.registerAll(this.list());
  }

  list(): StrategyMeta[] {
    return [...this.strategies.values()].map((strategy) => strategy.meta);
  }

  find(id: string, version: number): StrategyRegistration | undefined {
    return this.strategies.get(strategyKey(id, version));
  }
}

function buildRegistry(registrations: readonly StrategyRegistration[]): Map<string, StrategyRegistration> {
  const registry = new Map<string, StrategyRegistration>();
  for (const registration of registrations) {
    const key = strategyKey(registration.meta.id, registration.meta.version);
    if (registry.has(key)) {
      throw new Error(`strategy "${registration.meta.id}" v${registration.meta.version} is registered twice`);
    }
    registry.set(key, registration);
  }
  return registry;
}

function strategyKey(id: string, version: number): string {
  return `${id}@${version}`;
}

