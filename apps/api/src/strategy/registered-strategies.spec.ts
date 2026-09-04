import { registeredStrategies } from './registered-strategies';

describe('registeredStrategies', () => {
  it('registers all strategies required by the brief including sentiment', () => {
    expect(registeredStrategies.map((strategy) => strategy.meta.id)).toEqual([
      'ma',
      'macd',
      'macd',
      'rsi',
      'bollinger',
      'support-resistance',
      'sentiment',
    ]);
  });

  it('keeps macd v1 and v2 coexisting as independently selectable versions (ADR 0009)', () => {
    const macdVersions = registeredStrategies
      .filter((strategy) => strategy.meta.id === 'macd')
      .map((strategy) => strategy.meta.version);
    expect(macdVersions).toEqual([1, 2]);
  });
});
