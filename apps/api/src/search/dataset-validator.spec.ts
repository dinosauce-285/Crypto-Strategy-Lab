import { validateDataset, InvalidDatasetError } from './dataset-validator';

describe('validateDataset', () => {
  const validDataset = {
    pair: 'BTCUSDT',
    timeframe: '1h',
    from: 1700000000000,
    to: 1700100000000,
    rules: {
      entryPrice: 'next-open',
      feeRate: '0.001',
      warmupCandles: 20,
      profitMode: 'compound',
      drawdownMode: 'trade-close',
    },
  };

  it('accepts a valid dataset definition', () => {
    const result = validateDataset(validDataset);
    expect(result.pair).toBe('BTCUSDT');
    expect(result.timeframe).toBe('1h');
    expect(result.rules.entryPrice).toBe('next-open');
    expect(result.rules.feeRate).toBe('0.001');
    expect(result.rules.warmupCandles).toBe(20);
  });

  it('rejects invalid entryPrice ("whatever")', () => {
    expect(() =>
      validateDataset({
        ...validDataset,
        rules: { ...validDataset.rules, entryPrice: 'whatever' },
      }),
    ).toThrow(InvalidDatasetError);
  });

  it('rejects invalid profitMode ("nonsense") and drawdownMode ("garbage")', () => {
    expect(() =>
      validateDataset({
        ...validDataset,
        rules: { ...validDataset.rules, profitMode: 'nonsense' },
      }),
    ).toThrow(InvalidDatasetError);

    expect(() =>
      validateDataset({
        ...validDataset,
        rules: { ...validDataset.rules, drawdownMode: 'garbage' },
      }),
    ).toThrow(InvalidDatasetError);
  });

  it('rejects negative feeRate ("-5")', () => {
    expect(() =>
      validateDataset({
        ...validDataset,
        rules: { ...validDataset.rules, feeRate: '-5' },
      }),
    ).toThrow(InvalidDatasetError);
  });

  it('rejects invalid warmupCandles (-10 or 999999)', () => {
    expect(() =>
      validateDataset({
        ...validDataset,
        rules: { ...validDataset.rules, warmupCandles: -10 },
      }),
    ).toThrow(InvalidDatasetError);

    expect(() =>
      validateDataset({
        ...validDataset,
        rules: { ...validDataset.rules, warmupCandles: 999999 },
      }),
    ).toThrow(InvalidDatasetError);
  });

  it('rejects when from is greater than to', () => {
    expect(() =>
      validateDataset({
        ...validDataset,
        from: 1700200000000,
        to: 1700100000000,
      }),
    ).toThrow(InvalidDatasetError);
  });

  it('rejects from date in the distant future (e.g. year 2100)', () => {
    expect(() =>
      validateDataset({
        ...validDataset,
        from: 4102444800000, // 2100-01-01
        to: 4102531200000,
      }),
    ).toThrow(InvalidDatasetError);
  });
});
