import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Subscription } from 'rxjs';
import {
  EVENTS,
  MESSAGES,
  marketCandleTopic,
  marketPriceTopic,
  parseMarketTopic,
  type Candle,
  type Timeframe,
} from '@csl/contracts';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import { TopicAudience } from '../realtime/ports/topic-audience.port';
import { ExchangeStreamPort, type ExchangeStream, type PriceTick } from './ports/exchange-stream.port';
import { BinanceRestAdapter } from './binance-rest.adapter';
import { CandleRepository } from './candle.repository';

interface Watch {
  stream: ExchangeStream;
  price: boolean;
  timeframes: Set<Timeframe>;
}

/** Binance's REST klines endpoint caps a single request here — ADR 0023. */
const BACKFILL_LIMIT = 1000;

/**
 * The stream follows the screen: an upstream connection opens on the first watcher of
 * a pair and closes behind the last one (ADR 0020). The channel reports a topic string
 * and never learns what a pair is.
 */
@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MarketService.name);
  private readonly watches = new Map<string, Watch>();
  private audience?: Subscription;

  constructor(
    private readonly exchange: ExchangeStreamPort,
    private readonly channel: ChannelPublisher,
    private readonly topics: TopicAudience,
    private readonly events: EventEmitter2,
    private readonly binanceRest: BinanceRestAdapter,
    private readonly candles: CandleRepository,
  ) {}

  async getHistory(pair: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
    return this.candles.range(pair, timeframe, limit);
  }

  onModuleInit(): void {
    this.audience = this.topics.changes().subscribe(({ topic, watched }) => {
      const parsed = parseMarketTopic(topic);
      if (!parsed) return;
      if (watched) this.hold(parsed);
      else this.release(parsed);
    });
  }

  onModuleDestroy(): void {
    this.audience?.unsubscribe();
    for (const [pair, watch] of this.watches) {
      watch.stream.close();
      this.watches.delete(pair);
    }
  }

  private hold(parsed: NonNullable<ReturnType<typeof parseMarketTopic>>): void {
    const watch = this.watches.get(parsed.pair) ?? this.openStream(parsed.pair);
    if (parsed.kind === 'price') {
      watch.price = true;
      return;
    }
    if (!watch.timeframes.has(parsed.timeframe)) void this.backfill(parsed.pair, parsed.timeframe);
    watch.timeframes.add(parsed.timeframe);
    watch.stream.addTimeframe(parsed.timeframe);
  }

  private release(parsed: NonNullable<ReturnType<typeof parseMarketTopic>>): void {
    const watch = this.watches.get(parsed.pair);
    if (!watch) return;

    if (parsed.kind === 'price') {
      watch.price = false;
    } else {
      watch.timeframes.delete(parsed.timeframe);
      watch.stream.removeTimeframe(parsed.timeframe);
    }

    if (watch.price || watch.timeframes.size > 0) return;
    watch.stream.close();
    this.watches.delete(parsed.pair);
  }

  private openStream(pair: string): Watch {
    const stream = this.exchange.open(pair, {
      price: (tick) => this.onPrice(tick),
      candle: (candle) => this.onCandle(candle),
    });
    const watch: Watch = { stream, price: false, timeframes: new Set() };
    this.watches.set(pair, watch);
    return watch;
  }

  private onPrice(tick: PriceTick): void {
    this.channel.publish(marketPriceTopic(tick.pair), {
      type: MESSAGES.MarketPrice,
      payload: tick,
    });
    this.events.emit(EVENTS.MarketPriceUpdated, tick);
  }

  /**
   * Backfill on first watch (ADR 0023). Runs independently of the live subscription —
   * a failed fetch is logged and leaves the chart on its empty state until the first
   * candle closes live, it never blocks `hold`.
   */
  private async backfill(pair: string, timeframe: Timeframe): Promise<void> {
    try {
      if (await this.candles.hasHistory(pair, timeframe)) return;
      const history = await this.binanceRest.fetchKlines(pair, timeframe, BACKFILL_LIMIT);
      await this.candles.upsertMany(history);
    } catch (error) {
      this.logger.warn(`${pair} ${timeframe} backfill failed: ${(error as Error).message}`);
    }
  }

  private onCandle(candle: Candle): void {
    this.channel.publish(marketCandleTopic(candle.pair, candle.timeframe), {
      type: MESSAGES.MarketCandle,
      payload: { candle },
    });
    this.events.emit(EVENTS.CandleClosed, { candle });
  }
}
