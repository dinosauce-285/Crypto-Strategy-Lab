import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, TIMEFRAMES, type EventPayload } from '@csl/contracts';
import { PrismaService } from '../prisma/prisma.service';

/**
 * The smoke check for T01: it touches the database, the event bus and the shared
 * contracts package, so if any of the three is misconfigured this endpoint says so
 * instead of the problem surfacing days later.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private lastEventAt: number | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly events: EventEmitter2,
  ) {}

  async check() {
    let database: 'up' | 'down' = 'up';
    try {
      await this.prisma.ping();
    } catch (error) {
      database = 'down';
      this.logger.error(`Database unreachable: ${(error as Error).message}`);
    }

    // Publish and observe our own event, proving the bus is wired both ways.
    const probe: EventPayload<typeof EVENTS.MarketPriceUpdated> = {
      pair: 'BTCUSDT',
      price: '0',
      at: Date.now(),
    };
    this.events.emit(EVENTS.MarketPriceUpdated, probe);

    return {
      status: database === 'up' ? 'ok' : 'degraded',
      database,
      eventBus: this.lastEventAt ? 'up' : 'unknown',
      lastEventAt: this.lastEventAt,
      contracts: { timeframes: TIMEFRAMES },
    };
  }

  @OnEvent(EVENTS.MarketPriceUpdated)
  handlePriceUpdated(
    payload: EventPayload<typeof EVENTS.MarketPriceUpdated>,
  ): void {
    this.lastEventAt = payload.at;
  }
}
