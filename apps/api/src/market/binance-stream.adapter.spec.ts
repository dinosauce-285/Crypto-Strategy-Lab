import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { ConfigService } from '@nestjs/config';
import { BinanceStreamAdapter } from './binance-stream.adapter';

describe('BinanceStreamAdapter', () => {
  it('fetchCandles parses Binance REST kline payload into Candle[]', async () => {
    const config = new ConfigService({
      BINANCE_REST_URL: 'https://mock-binance.test',
    });

    const adapter = new BinanceStreamAdapter(config);

    const mockKlines = [
      [1600000000000, '100.5', '105.0', '99.0', '102.3', '50.12'],
      [1600000060000, '102.3', '104.0', '101.0', '103.5', '42.80'],
    ];

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async (input: Parameters<typeof fetch>[0]) => {
      const urlStr = input.toString();
      strictEqual(urlStr.includes('symbol=BTCUSDT'), true);
      strictEqual(urlStr.includes('interval=1m'), true);
      return {
        ok: true,
        json: async () => mockKlines,
      } as unknown as Response;
    };

    try {
      const candles = await adapter.fetchCandles({
        pair: 'BTCUSDT',
        timeframe: '1m',
        startTime: 1600000000000,
        endTime: 1600000120000,
      });

      strictEqual(candles.length, 2);
      deepStrictEqual(candles[0], {
        pair: 'BTCUSDT',
        timeframe: '1m',
        openTime: 1600000000000,
        open: '100.5',
        high: '105.0',
        low: '99.0',
        close: '102.3',
        volume: '50.12',
        closed: true,
      });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
