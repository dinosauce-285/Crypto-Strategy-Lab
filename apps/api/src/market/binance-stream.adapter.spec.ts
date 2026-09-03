import { ConfigService } from '@nestjs/config';
import { BinanceStreamAdapter } from './binance-stream.adapter';
import type { ExchangeStreamHandlers } from './ports/exchange-stream.port';

/**
 * Stand-in for the platform WebSocket used by open()'s reconnect loop — just enough of
 * the API (readyState, send, close, events) to drive the race that used to crash the
 * process, without a real socket. `send()` throws the same DOMException a real one does
 * when called before the handshake completes.
 */
class FakeWebSocket extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;

  readyState = FakeWebSocket.CONNECTING;
  sent: string[] = [];

  constructor(public readonly url: string) {
    super();
  }

  send(data: string) {
    if (this.readyState !== FakeWebSocket.OPEN) {
      throw new DOMException('Sent before connected.', 'InvalidStateError');
    }
    this.sent.push(data);
  }

  close() {
    if (this.readyState === FakeWebSocket.CLOSED) return;
    this.readyState = FakeWebSocket.CLOSED;
    this.dispatchEvent(new Event('close'));
  }

  // Test-only helpers — not part of the real WebSocket API.
  triggerOpen() {
    this.readyState = FakeWebSocket.OPEN;
    this.dispatchEvent(new Event('open'));
  }

  triggerError() {
    this.dispatchEvent(new Event('error'));
  }
}

describe('BinanceStreamAdapter open() reconnect race', () => {
  let sockets: FakeWebSocket[];
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    jest.useFakeTimers();
    sockets = [];
    originalWebSocket = globalThis.WebSocket;
    class TrackedFakeWebSocket extends FakeWebSocket {
      constructor(url: string) {
        super(url);
        sockets.push(this);
      }
    }
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = TrackedFakeWebSocket;
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    jest.useRealTimers();
  });

  const openAdapter = () => {
    const config = new ConfigService({
      BINANCE_INITIAL_BACKOFF_MS: 100,
      BINANCE_MAX_BACKOFF_MS: 100,
    });
    const adapter = new BinanceStreamAdapter(config);
    const handlers: ExchangeStreamHandlers = {
      price: jest.fn(),
      candle: jest.fn(),
      status: jest.fn(),
    };
    return { stream: adapter.open('BTCUSDT', handlers), handlers };
  };

  it('schedules exactly one reconnect when error and close both fire for the same drop', () => {
    const { stream } = openAdapter();
    expect(sockets).toHaveLength(1);

    // Per the WebSocket spec, a failed connection fires 'error' then 'close' for the
    // same failure — this used to schedule two independent reconnects.
    sockets[0].triggerError();
    sockets[0].close();

    jest.advanceTimersByTime(300);

    expect(sockets).toHaveLength(2);
    expect(() => sockets[1].triggerOpen()).not.toThrow();
    expect(sockets[1].sent).toHaveLength(1);

    stream.close();
  });

  it('ignores a late open event from a socket already superseded by a newer reconnect', () => {
    const { stream } = openAdapter();

    sockets[0].triggerError();
    jest.advanceTimersByTime(300);
    expect(sockets).toHaveLength(2);

    // The stale socket's handshake completes late, after a newer one has already taken
    // over — its 'open' handler must not act (in particular, must not send on it).
    expect(() => sockets[0].triggerOpen()).not.toThrow();
    expect(sockets[0].sent).toHaveLength(0);

    stream.close();
  });
});

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
      expect(urlStr.includes('symbol=BTCUSDT')).toBe(true);
      expect(urlStr.includes('interval=1m')).toBe(true);
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

      expect(candles).toHaveLength(2);
      expect(candles[0]).toEqual({
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

  it('fetchCandles retries on HTTP 429 rate limit before succeeding', async () => {
    const config = new ConfigService({
      BINANCE_REST_URL: 'https://mock-binance.test',
    });

    const adapter = new BinanceStreamAdapter(config);
    let attempts = 0;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => {
      attempts++;
      if (attempts === 1) {
        return {
          status: 429,
          ok: false,
          headers: new Headers({ 'Retry-After': '0' }),
        } as unknown as Response;
      }
      return {
        status: 200,
        ok: true,
        json: async () => [[1600000000000, '100.0', '105.0', '95.0', '102.0', '10']],
      } as unknown as Response;
    };

    try {
      const candles = await adapter.fetchCandles({
        pair: 'BTCUSDT',
        timeframe: '1m',
        startTime: 1600000000000,
      });

      expect(attempts).toBe(2);
      expect(candles).toHaveLength(1);
      expect(candles[0].open).toBe('100.0');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
