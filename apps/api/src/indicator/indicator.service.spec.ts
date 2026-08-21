import type { DataRequest } from '@csl/contracts';
import { IndicatorService } from './indicator.service';
import { movingAverageCalculator } from './calculators/moving-average.calculator';
import { bollingerBandsCalculator } from './calculators/bollinger-bands.calculator';
import { buildCandles } from './calculators/test-candles';

describe('IndicatorService', () => {
  const candles = buildCandles([1, 2, 3, 4, 5]);

  it('computes an indicator once and reuses it for a repeated request', () => {
    const service = new IndicatorService();
    const spy = jest.spyOn(movingAverageCalculator, 'compute');
    const request: DataRequest = { source: 'ma', params: { period: 3 } };

    const first = service.compute('dataset-1', candles, request);
    const second = service.compute('dataset-1', candles, request);

    expect(second).toBe(first);
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it("shares one computed pass across a multi-series indicator's fields", () => {
    const service = new IndicatorService();
    const spy = jest.spyOn(bollingerBandsCalculator, 'compute');

    service.compute('dataset-1', candles, { source: 'bollinger.upper', params: { period: 3 } });
    service.compute('dataset-1', candles, { source: 'bollinger.middle', params: { period: 3 } });

    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });

  it('does not share a cache entry across different datasets', () => {
    const service = new IndicatorService();
    const spy = jest.spyOn(movingAverageCalculator, 'compute');
    const request: DataRequest = { source: 'ma', params: { period: 3 } };

    service.compute('dataset-1', candles, request);
    service.compute('dataset-2', candles, request);

    expect(spy).toHaveBeenCalledTimes(2);
    spy.mockRestore();
  });

  it('throws for an unregistered indicator name', () => {
    const service = new IndicatorService();
    expect(() => service.compute('dataset-1', candles, { source: 'macd', params: {} })).toThrow();
  });

  it('throws for an unknown field of a registered indicator', () => {
    const service = new IndicatorService();
    expect(() =>
      service.compute('dataset-1', candles, { source: 'bollinger.nope', params: { period: 3 } }),
    ).toThrow();
  });
});
