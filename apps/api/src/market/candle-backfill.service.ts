import { Injectable } from '@nestjs/common';
import type { Timeframe } from '@csl/contracts';
import { CandleBackfillPort } from './ports/candle-backfill.port';
import { ExchangeHistoryPort } from './ports/exchange-history.port';
import { CandleRepository } from './candle.repository';

/** A Dataset's own fetch, on creation — the "load more history" feature ADR 0026 deferred. */
@Injectable()
export class CandleBackfillService extends CandleBackfillPort {
  constructor(
    private readonly exchangeHistory: ExchangeHistoryPort,
    private readonly candles: CandleRepository,
  ) {
    super();
  }

  async ensureRange(pair: string, timeframe: Timeframe, from: number, to: number): Promise<void> {
    const candles = await this.exchangeHistory.fetchRange(pair, timeframe, from, to);
    await this.candles.upsertMany(candles);
  }
}
