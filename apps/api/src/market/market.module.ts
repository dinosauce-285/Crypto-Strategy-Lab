import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { MarketService } from './market.service';
import { MarketController } from './market.controller';
import { BinanceStreamAdapter } from './binance-stream.adapter';
import { BinanceRestAdapter } from './binance-rest.adapter';
import { CandleRepository } from './candle.repository';
import { CandleBackfillService } from './candle-backfill.service';
import { ExchangeStreamPort } from './ports/exchange-stream.port';
import { ExchangeHistoryPort } from './ports/exchange-history.port';
import { CandleBackfillPort } from './ports/candle-backfill.port';

/**
 * One domain, one module: T06's REST adapter and candle repository belong beside the
 * stream adapter rather than in a second market module.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [MarketController],
  providers: [
    MarketService,
    CandleRepository,
    { provide: ExchangeStreamPort, useClass: BinanceStreamAdapter },
    { provide: ExchangeHistoryPort, useClass: BinanceRestAdapter },
    { provide: CandleBackfillPort, useClass: CandleBackfillService },
  ],
  exports: [CandleRepository, CandleBackfillPort],
})
export class MarketModule {}
