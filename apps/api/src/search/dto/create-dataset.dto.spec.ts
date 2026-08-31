import { parseCreateDataset } from './create-dataset.dto';

const NOW = 1_760_000_000_000;

const valid = () => ({
  pair: 'btcusdt',
  timeframe: '1m',
  from: NOW - 86_400_000,
  to: NOW,
  rules: {
    entryPrice: 'signal-close',
    feeRate: '0.001',
    warmupCandles: 20,
    profitMode: 'simple',
    drawdownMode: 'trade-close',
  },
});

describe('parseCreateDataset', () => {
  it('normalises the pair to upper case', () => {
    expect(parseCreateDataset(valid(), NOW).pair).toBe('BTCUSDT');
  });

  it('rejects a negative fee — a fee is paid, not earned', () => {
    const body = { ...valid(), rules: { ...valid().rules, feeRate: '-5' } };
    expect(() => parseCreateDataset(body, NOW)).toThrow('must not be negative');
  });

  it('rejects a fee that is a typo rather than a venue', () => {
    const body = { ...valid(), rules: { ...valid().rules, feeRate: '5' } };
    expect(() => parseCreateDataset(body, NOW)).toThrow('must not exceed');
  });

  it('rejects a fee that is not a number', () => {
    const body = { ...valid(), rules: { ...valid().rules, feeRate: '0,001' } };
    expect(() => parseCreateDataset(body, NOW)).toThrow('must be a decimal number');
  });

  it.each(['entryPrice', 'profitMode', 'drawdownMode'])('rejects an unknown %s', (field) => {
    const body = { ...valid(), rules: { ...valid().rules, [field]: 'nonsense' } };
    expect(() => parseCreateDataset(body, NOW)).toThrow(`rules.${field} must be one of`);
  });

  it.each([-10, 999_999])('rejects warmupCandles of %s', (warmupCandles) => {
    const body = { ...valid(), rules: { ...valid().rules, warmupCandles } };
    expect(() => parseCreateDataset(body, NOW)).toThrow('rules.warmupCandles must be an integer');
  });

  it('rejects a reversed range', () => {
    expect(() => parseCreateDataset({ ...valid(), from: NOW, to: NOW - 1 }, NOW)).toThrow(
      'from must be before to',
    );
  });

  it('rejects a range the exchange cannot have yet', () => {
    const body = { ...valid(), from: 4_102_444_800_000, to: 4_102_531_200_000 };
    expect(() => parseCreateDataset(body, NOW)).toThrow('must not be in the future');
  });

  it('rejects an unknown timeframe', () => {
    expect(() => parseCreateDataset({ ...valid(), timeframe: '3m' }, NOW)).toThrow(
      'timeframe must be one of',
    );
  });

  it('rejects a body with no rules at all', () => {
    const withoutRules = { ...valid(), rules: undefined };
    expect(() => parseCreateDataset(withoutRules, NOW)).toThrow('rules is required');
  });
});
