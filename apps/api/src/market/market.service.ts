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
import { ExchangeHistoryPort } from './ports/exchange-history.port';
import { CandleRepository, type CandleRangeOptions } from './candle.repository';

interface Watch {
  stream: ExchangeStream;
  price: boolean;
  timeframes: Set<Timeframe>;
  cursors: Map<Timeframe, number>;
  liveBuffers: Map<Timeframe, Candle[]>;
  isBackfilling: Map<Timeframe, boolean>;
  status: StreamStatus;
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
    private readonly exchangeHistory: ExchangeHistoryPort,
    private readonly candles: CandleRepository,
  ) {}

  async getHistory(pair: string, timeframe: Timeframe, options: CandleRangeOptions): Promise<Candle[]> {
    return this.candles.range(pair, timeframe, options);
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
    void this.ensureHistoryAndCursor(parsed.pair, parsed.timeframe, watch);
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

  /**
   * Backfill on first watch (ADR 0023). Runs independently of the live subscription —
   * a failed fetch is logged and leaves the chart on its empty state until the first
   * candle closes live, it never blocks `hold`.
   */
  private async ensureHistoryAndCursor(pair: string, timeframe: Timeframe, watch: Watch): Promise<void> {
    try {
      const hasHistory = await this.candles.hasHistory(pair, timeframe);
      if (!hasHistory) {
        const history = await this.exchangeHistory.fetchKlines(pair, timeframe, BACKFILL_LIMIT);
        await this.candles.upsertMany(history);
        const latest = history[history.length - 1];
        if (latest && !watch.cursors.has(timeframe)) {
          watch.cursors.set(timeframe, latest.openTime);
        }
      } else {
        const latestRows = await this.candles.range(pair, timeframe, { limit: 1 });
        if (latestRows.length > 0 && !watch.cursors.has(timeframe)) {
          watch.cursors.set(timeframe, latestRows[0].openTime);
        }
      }
    } catch (error) {
      this.logger.warn(`${pair} ${timeframe} history init failed: ${(error as Error).message}`);
    }
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
      let lastCursor = watch.cursors.get(timeframe);
      if (!lastCursor) {
        const recent = await this.candles.range(pair, timeframe, { limit: 1 });
        if (recent.length > 0) {
          lastCursor = recent[0].openTime;
          watch.cursors.set(timeframe, lastCursor);
        }
      }

      if (!lastCursor) continue;

      watch.isBackfilling.set(timeframe, true);
      watch.liveBuffers.set(timeframe, []);

      try {
        const fetchedCandles: Candle[] = [];
        let currentStart = lastCursor + 1;
        const now = Date.now();

        this.logger.log(
          `Recovering gap for ${pair} ${timeframe} from cursor ${new Date(lastCursor).toISOString()}`,
        );

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

          // Pacing delay between pages to avoid burst load / rate limit
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        const buffered = watch.liveBuffers.get(timeframe) ?? [];
        const merged = new Map<number, Candle>();
        for (const c of fetchedCandles) merged.set(c.openTime, c);
        for (const c of buffered) merged.set(c.openTime, c);

        const sorted = Array.from(merged.values()).sort((a, b) => a.openTime - b.openTime);
        let emittedCount = 0;
        for (const candle of sorted) {
          const currentCursor = watch.cursors.get(timeframe) ?? 0;
          if (candle.openTime > currentCursor) {
            watch.cursors.set(timeframe, candle.openTime);
            this.emitCandle(candle);
            emittedCount++;
          }
        }
        if (emittedCount > 0) {
          this.logger.log(
            `Successfully recovered and emitted ${emittedCount} missed candle(s) for ${pair} ${timeframe}`,
          );
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
