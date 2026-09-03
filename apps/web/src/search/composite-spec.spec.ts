import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { canonicalJson, type StrategyMeta } from '@csl/contracts';
import {
  balancedParts,
  buildSpec,
  defaultParams,
  strategyKey,
} from './composite-spec';

describe('Manual composite spec builder (T47)', () => {
  const dummyMA: StrategyMeta = {
    id: 'moving-average',
    name: 'Moving Average Crossover',
    version: 1,
    group: 'TREND',
    warmup: 25,
    params: [
      { name: 'fastPeriod', type: 'int', default: 9, min: 2, max: 50, step: 1 },
      { name: 'slowPeriod', type: 'int', default: 21, min: 5, max: 200, step: 1 },
    ],
  };

  const dummyRSI: StrategyMeta = {
    id: 'rsi',
    name: 'Relative Strength Index',
    version: 1,
    group: 'MOMENTUM',
    warmup: 15,
    params: [
      { name: 'period', type: 'int', default: 14, min: 2, max: 50, step: 1 },
    ],
  };

  it('uses defaultParams when no custom params are provided', () => {
    const selected = [dummyMA, dummyRSI];
    const parts = balancedParts(selected);
    const spec = buildSpec(selected, parts, 0.5);

    strictEqual(spec !== null, true);
    strictEqual(spec?.members.length, 2);

    const maMember = spec?.members.find((m) => m.id === 'moving-average');
    deepStrictEqual(maMember?.params, { fastPeriod: 9, slowPeriod: 21 });
    strictEqual(maMember?.paramsHash, canonicalJson({ fastPeriod: 9, slowPeriod: 21 }));

    const rsiMember = spec?.members.find((m) => m.id === 'rsi');
    deepStrictEqual(rsiMember?.params, { period: 14 });
    strictEqual(rsiMember?.paramsHash, canonicalJson({ period: 14 }));
  });

  it('uses custom params when provided for individual strategies', () => {
    const selected = [dummyMA, dummyRSI];
    const parts = balancedParts(selected);
    const maKey = strategyKey(dummyMA);
    const customParams = {
      [maKey]: { fastPeriod: 12, slowPeriod: 26 },
    };

    const spec = buildSpec(selected, parts, 0.5, customParams);

    strictEqual(spec !== null, true);
    const maMember = spec?.members.find((m) => m.id === 'moving-average');
    deepStrictEqual(maMember?.params, { fastPeriod: 12, slowPeriod: 26 });
    strictEqual(maMember?.paramsHash, canonicalJson({ fastPeriod: 12, slowPeriod: 26 }));

    // RSI was not customized, so it should retain default params
    const rsiMember = spec?.members.find((m) => m.id === 'rsi');
    deepStrictEqual(rsiMember?.params, { period: 14 });
    strictEqual(rsiMember?.paramsHash, canonicalJson({ period: 14 }));
  });

  it('defaultParams extracts default parameter map from StrategyMeta', () => {
    deepStrictEqual(defaultParams(dummyMA), { fastPeriod: 9, slowPeriod: 21 });
    deepStrictEqual(defaultParams(dummyRSI), { period: 14 });
  });
});
