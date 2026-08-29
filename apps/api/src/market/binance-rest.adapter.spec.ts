import { ConfigService } from '@nestjs/config';
import { NotFoundException } from '@nestjs/common';
import { BinanceRestAdapter } from './binance-rest.adapter';

describe('BinanceRestAdapter', () => {
  const config = new ConfigService({ BINANCE_REST_URL: 'https://mock-binance.test' });

  it('fetchKlines parses Binance REST kline payload into Candle[]', async () => {
    const adapter = new BinanceRestAdapter(config);
    const mockKlines = [[1600000000000, '100.5', '105.0', '99.0', '102.3', '50.12']];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({ ok: true, json: async () => mockKlines }) as unknown as Response;

    try {
      const candles = await adapter.fetchKlines('BTCUSDT', '1m', 1);
      expect(candles).toEqual([
        {
          pair: 'BTCUSDT',
          timeframe: '1m',
          openTime: 1600000000000,
          open: '100.5',
          high: '105.0',
          low: '99.0',
          close: '102.3',
          volume: '50.12',
          closed: true,
        },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('encodes the pair instead of interpolating it raw into the URL (L-67)', async () => {
    const adapter = new BinanceRestAdapter(config);
    const seenUrls: string[] = [];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: Parameters<typeof fetch>[0]) => {
      seenUrls.push(input.toString());
      return { ok: true, json: async () => [] } as unknown as Response;
    };

    try {
      await adapter.fetchKlines('BTC&limit=9999', '1h', 5);
      const url = new URL(seenUrls[0]);
      expect(url.searchParams.get('symbol')).toBe('BTC&limit=9999');
      expect(url.searchParams.get('limit')).toBe('5');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('maps a Binance 400 (bad symbol) to a NotFoundException instead of a raw 500 (L-57)', async () => {
    const adapter = new BinanceRestAdapter(config);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 400,
        json: async () => ({ code: -1121, msg: 'Invalid symbol.' }),
      }) as unknown as Response;

    try {
      await expect(adapter.fetchKlines('FAKEUSDT', '1h', 5)).rejects.toThrow(NotFoundException);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('leaves non-400 failures as generic errors', async () => {
    const adapter = new BinanceRestAdapter(config);

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () =>
      ({ ok: false, status: 503, json: async () => ({}) }) as unknown as Response;

    try {
      await expect(adapter.fetchKlines('BTCUSDT', '1h', 5)).rejects.toThrow(
        'Binance klines request failed: HTTP 503',
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
