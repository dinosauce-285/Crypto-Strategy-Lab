import type { DataRequest, StrategyContext, StrategyMeta } from '@csl/contracts';
import { canonicalJson } from '@csl/contracts';
import { UnknownStrategyError } from '../search/ports/strategy-factory.port';
import { movingAverageCalculator } from '../indicator/calculators/moving-average.calculator';
import { buildCandles } from '../indicator/calculators/test-candles';
import { StrategyFactoryService } from './strategy-factory.service';
import { StrategyRegistry } from './strategy.registry';
import { StrategyRepository } from './strategy.repository';

const savedMetas: StrategyMeta[] = [];
const repository = {
  registerAll: (metas: readonly StrategyMeta[]): Promise<void> => {
    savedMetas.push(...metas);
    return Promise.resolve();
  },
} as unknown as StrategyRepository;

describe('StrategyFactoryService', () => {
  it('builds a runnable strategy from the registry', async () => {
    const registry = new StrategyRegistry(repository);
    await registry.onModuleInit();
    const factory = new StrategyFactoryService(registry);

    const runnable = await factory.build({
      rule: 'weighted',
      threshold: 0.5,
      members: [
        {
          id: 'ma',
          version: 1,
          params: { fastPeriod: 2, slowPeriod: 3 },
          paramsHash: canonicalJson({ fastPeriod: 2, slowPeriod: 3 }),
          weight: 1,
        },
      ],
    });

    expect(savedMetas.some((meta) => meta.id === 'ma' && meta.version === 1)).toBe(true);
    expect(runnable.requires()).toEqual([
      { source: 'ma', params: { period: 2 } },
      { source: 'ma', params: { period: 3 } },
    ]);
    expect(runnable.analyze(contextAt(4))).toEqual({ direction: 'BUY', strength: 1 });
  });

  it('rejects an unregistered strategy', async () => {
    const factory = new StrategyFactoryService(new StrategyRegistry(repository));

    await expect(
      factory.build({
        rule: 'weighted',
        threshold: 0.5,
        members: [
          {
            id: 'macd',
            version: 1,
            params: {},
            paramsHash: canonicalJson({}),
            weight: 1,
          },
        ],
      }),
    ).rejects.toBeInstanceOf(UnknownStrategyError);
  });
});

function contextAt(index: number): StrategyContext {
  const candles = buildCandles([5, 4, 3, 4, 5]);
  return {
    candles,
    index,
    get: (request: DataRequest) => movingAverageCalculator.compute(candles, request.params).value,
  };
}
