import { StrategyController } from './strategy.controller';
import { StrategyRegistry } from './strategy.registry';

describe('StrategyController', () => {
  it('returns registered strategy metadata list', () => {
    const mockRegistry = {
      list: jest.fn().mockReturnValue([
        {
          id: 'sma-cross',
          name: 'SMA Crossover',
          version: 1,
          group: 'trend',
          warmup: 20,
          params: [{ name: 'fast', type: 'number', default: 10, min: 2, max: 50, step: 1 }],
        },
      ]),
    } as unknown as StrategyRegistry;

    const controller = new StrategyController(mockRegistry);
    const result = controller.list();

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('sma-cross');
    expect(mockRegistry.list).toHaveBeenCalled();
  });
});
