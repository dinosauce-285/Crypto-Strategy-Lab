import { registeredStrategies } from './registered-strategies';

describe('registeredStrategies', () => {
  it('registers all strategies required by the brief including sentiment', () => {
    expect(registeredStrategies.map((strategy) => strategy.meta.id)).toEqual([
      'ma',
      'rsi',
      'bollinger',
      'support-resistance',
      'sentiment',
    ]);
  });
});
