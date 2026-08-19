import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
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

interface Watch {
  stream: ExchangeStream;
  price: boolean;
  timeframes: Set<Timeframe>;
}

/**
 * The stream follows the screen: an upstream connection opens on the first watcher of
 * a pair and closes behind the last one (ADR 0020). The channel reports a topic string
 * and never learns what a pair is.
 */
@Injectable()
export class MarketService implements OnModuleInit, OnModuleDestroy {
  private readonly watches = new Map<string, Watch>();
  private audience?: Subscription;

  constructor(
    private readonly exchange: ExchangeStreamPort,
    private readonly channel: ChannelPublisher,
    private readonly topics: TopicAudience,
    private readonly events: EventEmitter2,
  ) {}

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

  private onCandle(candle: Candle): void {
    this.channel.publish(marketCandleTopic(candle.pair, candle.timeframe), {
      type: MESSAGES.MarketCandle,
      payload: { candle },
    });
    this.events.emit(EVENTS.CandleClosed, { candle });
  }
}
