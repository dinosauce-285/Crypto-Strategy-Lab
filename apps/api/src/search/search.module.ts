import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/realtime.module';
import { BacktestQueue } from './backtest-queue';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

/**
 * The API half of the loop: it queues candidates and watches them, and never runs one.
 * The worker half bootstraps `BacktestWorkerModule` in its own process (ADR 0004).
 *
 * `CandidateSource` is not provided here. Until T17 binds one, a run ends immediately
 * with "exhausted", which is the honest state rather than a fabricated one.
 */
@Module({
  imports: [RealtimeModule],
  controllers: [SearchController],
  providers: [BacktestQueue, SearchService],
})
export class SearchModule {}
