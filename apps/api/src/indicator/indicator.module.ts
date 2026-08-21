import { Module } from '@nestjs/common';
import { IndicatorService } from './indicator.service';
import { IndicatorPort } from './ports/indicator.port';

/**
 * Nothing imports this module yet — its two callers, the backtest engine's
 * `StrategyContext` (T11-13) and a chart endpoint (T14), don't exist. It exports only
 * the port, per `BACKEND_CONSTRAINT.md`'s "no concrete cross-module injection" rule.
 */
@Module({
  providers: [{ provide: IndicatorPort, useClass: IndicatorService }],
  exports: [IndicatorPort],
})
export class IndicatorModule {}
