import { registeredStrategies } from './registered-strategies';

describe('registeredStrategies', () => {
  it('registers the four standalone strategies required by the brief', () => {
    expect(registeredStrategies.map((strategy) => strategy.meta.id)).toEqual([
      'ma',
      'rsi',
      'bollinger',
      'support-resistance',
    ]);
  });
});
