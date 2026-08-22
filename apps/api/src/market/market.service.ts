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
import {
  ExchangeStreamPort,
  type ExchangeStream,
  type PriceTick,
  type StreamStatus,
} from './ports/exchange-stream.port';

interface Watch {
  stream: ExchangeStream;
  price: boolean;
  timeframes: Set<Timeframe>;
  cursors: Map<Timeframe, number>;
  liveBuffers: Map<Timeframe, Candle[]>;
  isBackfilling: Map<Timeframe, boolean>;
  status: StreamStatus;
}

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
      watch.cursors.delete(parsed.timeframe);
      watch.liveBuffers.delete(parsed.timeframe);
      watch.isBackfilling.delete(parsed.timeframe);
    }

    if (watch.price || watch.timeframes.size > 0) return;
    watch.stream.close();
    this.watches.delete(parsed.pair);
  }

  private openStream(pair: string): Watch {
    const watch: Watch = {
      stream: null as unknown as ExchangeStream,
      price: false,
      timeframes: new Set(),
      cursors: new Map(),
      liveBuffers: new Map(),
      isBackfilling: new Map(),
      status: 'connected',
    };

    watch.stream = this.exchange.open(pair, {
      price: (tick) => this.onPrice(tick),
      candle: (candle) => this.onCandle(watch, candle),
      status: (status) => this.onStatus(pair, watch, status),
    });

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

  private onCandle(watch: Watch, candle: Candle): void {
    if (watch.isBackfilling.get(candle.timeframe)) {
      const buffer = watch.liveBuffers.get(candle.timeframe) ?? [];
      buffer.push(candle);
      watch.liveBuffers.set(candle.timeframe, buffer);
      return;
    }

    watch.cursors.set(candle.timeframe, candle.openTime);
    this.emitCandle(candle);
  }

  private emitCandle(candle: Candle): void {
    this.channel.publish(marketCandleTopic(candle.pair, candle.timeframe), {
      type: MESSAGES.MarketCandle,
      payload: { candle },
    });
    this.events.emit(EVENTS.CandleClosed, { candle });
  }

  private onStatus(pair: string, watch: Watch, status: StreamStatus): void {
    watch.status = status;
    if (status === 'connected') {
      void this.recoverGaps(pair, watch);
    } else if (status === 'failed') {
      this.logger.error(`Stream for ${pair} failed to recover after max retries`);
    }
  }

  private async recoverGaps(pair: string, watch: Watch): Promise<void> {
    for (const timeframe of watch.timeframes) {
      const lastCursor = watch.cursors.get(timeframe);
      if (!lastCursor) continue;

      watch.isBackfilling.set(timeframe, true);
      watch.liveBuffers.set(timeframe, []);

      try {
        const fetchedCandles: Candle[] = [];
        let currentStart = lastCursor + 1;
        const now = Date.now();

        while (currentStart < now) {
          const chunk = await this.exchange.fetchCandles({
            pair,
            timeframe,
            startTime: currentStart,
            limit: 1000,
          });
          if (chunk.length === 0) break;
          fetchedCandles.push(...chunk);
          const lastInChunk = chunk[chunk.length - 1];
          if (chunk.length < 1000 || lastInChunk.openTime <= currentStart) break;
          currentStart = lastInChunk.openTime + 1;
        }

        const buffered = watch.liveBuffers.get(timeframe) ?? [];
        const merged = new Map<number, Candle>();
        for (const c of fetchedCandles) merged.set(c.openTime, c);
        for (const c of buffered) merged.set(c.openTime, c);

        const sorted = Array.from(merged.values()).sort((a, b) => a.openTime - b.openTime);
        for (const candle of sorted) {
          const currentCursor = watch.cursors.get(timeframe) ?? 0;
          if (candle.openTime > currentCursor) {
            watch.cursors.set(timeframe, candle.openTime);
            this.emitCandle(candle);
          }
        }
      } catch (error) {
        this.logger.warn(`Gap recovery failed for ${pair} ${timeframe}: ${String(error)}`);
        const buffered = watch.liveBuffers.get(timeframe) ?? [];
        for (const candle of buffered) {
          this.emitCandle(candle);
        }
      } finally {
        watch.isBackfilling.delete(timeframe);
        watch.liveBuffers.delete(timeframe);
      }
    }
  }
}
