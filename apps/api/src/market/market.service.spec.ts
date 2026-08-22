import { strictEqual, deepStrictEqual, ok } from 'node:assert';
import { Subject } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Candle, Timeframe } from '@csl/contracts';
import { MarketService } from './market.service';
import {
  ExchangeStreamPort,
  type ExchangeStream,
  type ExchangeStreamHandlers,
  type HistoricalRangeQuery,
} from './ports/exchange-stream.port';
import type { ExchangeHistoryPort } from './ports/exchange-history.port';
import type { CandleRepository } from './candle.repository';
import type { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import type { TopicAudience } from '../realtime/ports/topic-audience.port';

class MockExchangeStreamPort extends ExchangeStreamPort {
  public handlers?: ExchangeStreamHandlers;
  public activeTimeframes = new Set<Timeframe>();
  public isClosed = false;
  public mockHistoricalCandles: Candle[] = [];
  public fetchHistoryCalls: HistoricalRangeQuery[] = [];
  public shouldFailFetch = false;

  open(_pair: string, handlers: ExchangeStreamHandlers): ExchangeStream {
    this.handlers = handlers;
    this.isClosed = false;
    return {
      addTimeframe: (tf) => this.activeTimeframes.add(tf),
      removeTimeframe: (tf) => this.activeTimeframes.delete(tf),
      close: () => {
        this.isClosed = true;
      },
    };
  }

  async fetchCandles(query: HistoricalRangeQuery): Promise<Candle[]> {
    this.fetchHistoryCalls.push(query);
    if (this.shouldFailFetch) {
      throw new Error('Historical REST endpoint failure');
    }
    const limit = query.limit ?? 1000;
    return this.mockHistoricalCandles
      .filter(
        (c) =>
          c.timeframe === query.timeframe &&
          c.openTime >= query.startTime &&
          (!query.endTime || c.openTime <= query.endTime),
      )
      .slice(0, limit);
  }
}

function makeCandle(pair: string, timeframe: Timeframe, openTime: number): Candle {
  return {
    pair,
    timeframe,
    openTime,
    open: '100',
    high: '105',
    low: '95',
    close: '102',
    volume: '10',
    closed: true,
  };
}

describe('MarketService & Connection Recovery (T09)', () => {
  function setup() {
    const exchange = new MockExchangeStreamPort();
    const published: { topic: string; message: unknown }[] = [];
    const emittedEvents: { event: string; payload: unknown }[] = [];

    const channel: ChannelPublisher = {
      publish: (topic, message) => published.push({ topic, message }),
    };

    const topicSubject = new Subject<{ topic: string; watched: boolean }>();
    const topics: TopicAudience = {
      changes: () => topicSubject.asObservable(),
    };

    const events = new EventEmitter2();
    events.emit = (event: string, payload: unknown) => {
      emittedEvents.push({ event, payload });
      return true;
    };

    const exchangeHistory: ExchangeHistoryPort = {
      fetchKlines: async () => [],
    };

    const candles = {
      range: async () => [],
      hasHistory: async () => false,
      upsertMany: async () => {},
      upsert: async () => {},
      onCandleClosed: async () => {},
    } as unknown as CandleRepository;

    const service = new MarketService(
      exchange,
      channel,
      topics,
      events,
      exchangeHistory,
      candles,
    );
    service.onModuleInit();

    return { service, exchange, published, emittedEvents, topicSubject };
  }

  it('normal stream advances cursor and emits closed candles', () => {
    const { service, exchange, published, topicSubject } = setup();

    topicSubject.next({ topic: 'market:BTCUSDT:1m', watched: true });
    expect(exchange.handlers).toBeTruthy();

    const c1 = makeCandle('BTCUSDT', '1m', 1000);
    exchange.handlers?.candle(c1);

    expect(published.length).toBe(1);
    expect(published[0].topic).toBe('market:BTCUSDT:1m');

    service.onModuleDestroy();
  });

  it('reconnect triggers backfill, merges with buffered live data, deduplicates and emits in order', async () => {
    const { service, exchange, published, topicSubject } = setup();

    topicSubject.next({ topic: 'market:BTCUSDT:1m', watched: true });
    expect(exchange.handlers).toBeTruthy();

    // Initial candle establishing cursor at T=1000
    exchange.handlers?.candle(makeCandle('BTCUSDT', '1m', 1000));
    expect(published.length).toBe(1);

    // Disconnect happens
    exchange.handlers?.status?.('reconnecting');

    // Missed candles available via REST backfill
    exchange.mockHistoricalCandles = [
      makeCandle('BTCUSDT', '1m', 1060),
      makeCandle('BTCUSDT', '1m', 1120),
      makeCandle('BTCUSDT', '1m', 1180),
    ];

    // Reconnection succeeded
    const recoveryPromise = new Promise((resolve) => setTimeout(resolve, 50));
    exchange.handlers?.status?.('connected');

    // Live candle arriving during backfill (T=1180 duplicate + T=1240 new)
    exchange.handlers?.candle(makeCandle('BTCUSDT', '1m', 1180));
    exchange.handlers?.candle(makeCandle('BTCUSDT', '1m', 1240));

    await recoveryPromise;

    // Expected published candles: 1000 (initial), 1060, 1120, 1180 (deduped), 1240
    const emittedOpenTimes = published.map(
      (p) => (p.message as { payload: { candle: Candle } }).payload.candle.openTime,
    );
    expect(emittedOpenTimes).toEqual([1000, 1060, 1120, 1180, 1240]);

    service.onModuleDestroy();
  });

  it('paginates large gap across multiple historical chunks', async () => {
    const { service, exchange, published, topicSubject } = setup();

    topicSubject.next({ topic: 'market:BTCUSDT:1m', watched: true });
    expect(exchange.handlers).toBeTruthy();

    exchange.handlers?.candle(makeCandle('BTCUSDT', '1m', 1000));

    // Create 1200 historical candles
    exchange.mockHistoricalCandles = Array.from({ length: 1200 }, (_, i) =>
      makeCandle('BTCUSDT', '1m', 1000 + (i + 1) * 60),
    );

    exchange.handlers?.status?.('reconnecting');
    const recoveryPromise = new Promise((resolve) => setTimeout(resolve, 50));
    exchange.handlers?.status?.('connected');

    await recoveryPromise;

    // fetchCandles should have been called twice (1000 chunk + 200 chunk)
    expect(exchange.fetchHistoryCalls.length).toBe(2);
    // 1 initial candle + 1200 recovered candles
    expect(published.length).toBe(1201);

    service.onModuleDestroy();
  });

  it('handles historical fetch error gracefully by flushing live buffer without crashing', async () => {
    const { service, exchange, published, topicSubject } = setup();

    topicSubject.next({ topic: 'market:ETHUSDT:5m', watched: true });
    expect(exchange.handlers).toBeTruthy();

    exchange.handlers?.candle(makeCandle('ETHUSDT', '5m', 5000));
    exchange.shouldFailFetch = true;

    exchange.handlers?.status?.('reconnecting');
    exchange.handlers?.status?.('connected');

    exchange.handlers?.candle(makeCandle('ETHUSDT', '5m', 6000));

    await new Promise((resolve) => setTimeout(resolve, 50));

    const emittedOpenTimes = published.map(
      (p) => (p.message as { payload: { candle: Candle } }).payload.candle.openTime,
    );
    expect(emittedOpenTimes).toEqual([5000, 6000]);

    service.onModuleDestroy();
  });

  it('unsubscribing releases stream and cleans up resources', () => {
    const { exchange, service, topicSubject } = setup();

    topicSubject.next({ topic: 'market:BTCUSDT:1m', watched: true });
    expect(exchange.isClosed).toBe(false);

    topicSubject.next({ topic: 'market:BTCUSDT:1m', watched: false });
    expect(exchange.isClosed).toBe(true);

    service.onModuleDestroy();
  });
});
