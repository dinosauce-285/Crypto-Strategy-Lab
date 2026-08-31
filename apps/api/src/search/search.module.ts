import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { StrategyModule } from '../strategy/strategy.module';
import { MarketModule } from '../market/market.module';
import { IndicatorModule } from '../indicator/indicator.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { BacktestQueue } from './backtest-queue';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { BacktestController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { DatasetRepository } from './dataset.repository';
import { BacktestRunner } from './ports/backtest-runner.port';
import { BacktestRunnerService } from './backtest-runner.service';
import { CandidateSource } from './ports/candidate-source.port';
import { GeneratedCandidateSource } from './generated-candidate-source';

@Module({
  imports: [
    PrismaModule,
    RealtimeModule,
    StrategyModule,
    MarketModule,
    IndicatorModule,
    EvaluationModule,
  ],
  controllers: [SearchController, BacktestController],
  providers: [
    BacktestQueue,
    SearchService,
    DatasetRepository,
    BacktestService,
    { provide: BacktestRunner, useClass: BacktestRunnerService },
    { provide: CandidateSource, useClass: GeneratedCandidateSource },
  ],
  exports: [DatasetRepository],
})
export class SearchModule {}
