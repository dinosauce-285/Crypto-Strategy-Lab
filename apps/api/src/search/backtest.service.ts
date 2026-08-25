import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS, type Dataset } from '@csl/contracts';
import { CandleRepository } from '../market/candle.repository';
import { CandleBackfillPort } from '../market/ports/candle-backfill.port';
import { IndicatorPort } from '../indicator/ports/indicator.port';
import { EvaluatorPort } from '../evaluation/ports/evaluator.port';
import { StrategyFactory } from './ports/strategy-factory.port';
import { BacktestRunner } from './ports/backtest-runner.port';
import { DatasetRepository } from './dataset.repository';
import { validateSpec } from './spec-validator';
import type { SingleRunRequestDto, SingleRunResponseDto } from './dto/single-run.dto';
import { specHash } from './spec-hash';

@Injectable()
export class BacktestService {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly candles: CandleRepository,
    private readonly backfill: CandleBackfillPort,
    private readonly indicators: IndicatorPort,
    private readonly evaluator: EvaluatorPort,
    private readonly factory: StrategyFactory,
    private readonly runner: BacktestRunner,
    private readonly emitter: EventEmitter2,
  ) {}

  async listDatasets(): Promise<Dataset[]> {
    return this.datasets.list();
  }

  async createDataset(data: Omit<Dataset, 'id'>): Promise<Dataset> {
    return this.createDatasetWithHistory(data);
  }

  /**
   * Every Dataset gets its own candle range fetched before it's usable (ADR 0041) —
   * shared by the explicit create endpoint and `runSingle`'s inline-create path, so
   * neither one can hand back a Dataset with no data behind it. A failed fetch must
   * not leave an orphan row behind either — only rolled back if this call is the one
   * that created it; a pre-existing row already has its history and stays put.
   */
  private async createDatasetWithHistory(data: Omit<Dataset, 'id'>): Promise<Dataset> {
    const { dataset, created } = await this.datasets.create(data);
    try {
      await this.backfill.ensureRange(dataset.pair, dataset.timeframe, dataset.from, dataset.to);
      const candles = await this.candles.range(dataset.pair, dataset.timeframe, {
        from: dataset.from,
        to: dataset.to,
      });
      if (candles.length === 0) {
        throw new BadRequestException(
          `Dataset range (${new Date(dataset.from).toISOString()} - ${new Date(dataset.to).toISOString()}) contains no market candle data`,
        );
      }
    } catch (error) {
      if (created) await this.datasets.delete(dataset.id);
      throw error;
    }
    return dataset;
  }

  async runSingle(request: SingleRunRequestDto): Promise<SingleRunResponseDto> {
    let dataset: Dataset | null = null;

    if (request.datasetId) {
      dataset = await this.datasets.findById(request.datasetId);
      if (!dataset) {
        throw new NotFoundException(`Dataset "${request.datasetId}" not found`);
      }
    } else if (request.dataset) {
      dataset = await this.createDatasetWithHistory(request.dataset);
    } else {
      throw new BadRequestException('Either datasetId or dataset definition must be provided');
    }

    const validatedSpec = validateSpec(request.spec);
    const hash = specHash(validatedSpec);

    // 1. Build strategy instance
    const strategy = await this.factory.build(validatedSpec);

    // 2. Load candle bars for the dataset range
    const candleSeries = await this.candles.range(dataset.pair, dataset.timeframe, {
      from: dataset.from,
      to: dataset.to,
    });

    if (candleSeries.length === 0) {
      throw new BadRequestException(
        `Dataset "${dataset.id}" contains no market candle data for backtesting`,
      );
    }

    // 3. Run backtest simulation
    const rawTrades = await this.runner.run(strategy, dataset.id);

    // 4. Evaluate metrics & persist to DB atomically via EvaluatorPort
    const evaluationResult = await this.evaluator.evaluateAndRecord({
      datasetId: dataset.id,
      spec: validatedSpec,
      specHash: hash,
      rules: dataset.rules,
      trades: rawTrades,
      candles: candleSeries,
    });

    // Notify listeners (Leaderboard & WebSocket push channel)
    this.emitter.emit('experiment.completed', {
      datasetId: dataset.id,
      experimentId: evaluationResult.experimentId,
    });
    this.emitter.emit(EVENTS.LeaderboardUpdated, {
      datasetId: dataset.id,
    });

    // 5. Compute indicators for chart overlays (ADR 0008, §5, §25, §46 step 6)
    const indicators: Record<string, number[]> = {};
    if (candleSeries.length > 0) {
      let hasMa = false;
      let hasSr = false;

      for (const member of validatedSpec.members) {
        if (member.id === 'ma') {
          hasMa = true;
          const fastPeriod = member.params.fastPeriod ?? 20;
          const slowPeriod = member.params.slowPeriod ?? 50;

          try {
            const fast = this.indicators.compute(dataset.id, candleSeries, {
              source: 'ma',
              params: { period: fastPeriod },
            });
            indicators['ma.fast'] = [...fast];
            indicators[`ma.${fastPeriod}`] = [...fast];
          } catch {
            // Safe fallback
          }

          try {
            const slow = this.indicators.compute(dataset.id, candleSeries, {
              source: 'ma',
              params: { period: slowPeriod },
            });
            indicators['ma.slow'] = [...slow];
            indicators[`ma.${slowPeriod}`] = [...slow];
          } catch {
            // Safe fallback
          }
        } else if (member.id === 'bollinger') {
          const period = member.params.period ?? 20;
          const stdDevMultiplier = member.params.stdDevMultiplier ?? 2;

          try {
            const bbUpper = this.indicators.compute(dataset.id, candleSeries, {
              source: 'bollinger.upper',
              params: { period, stdDevMultiplier },
            });
            indicators['bb.upper'] = [...bbUpper];

            const bbLower = this.indicators.compute(dataset.id, candleSeries, {
              source: 'bollinger.lower',
              params: { period, stdDevMultiplier },
            });
            indicators['bb.lower'] = [...bbLower];
          } catch {
            // Safe fallback
          }
        } else if (member.id === 'support-resistance') {
          hasSr = true;
          const pivotLookback = member.params.pivotLookback ?? 5;
          const mergeThresholdPct = member.params.mergeThresholdPct ?? 0.5;

          try {
            const srSupport = this.indicators.compute(dataset.id, candleSeries, {
              source: 'support-resistance.support',
              params: { pivotLookback, mergeThresholdPct },
            });
            indicators['sr.support'] = [...srSupport];

            const srResistance = this.indicators.compute(dataset.id, candleSeries, {
              source: 'support-resistance.resistance',
              params: { pivotLookback, mergeThresholdPct },
            });
            indicators['sr.resistance'] = [...srResistance];
          } catch {
            // Safe fallback
          }
        }
      }

      // If support-resistance was not explicitly configured in candidate, compute baseline (§5, §46 step 6)
      if (!hasSr) {
        try {
          const srSupport = this.indicators.compute(dataset.id, candleSeries, {
            source: 'support-resistance.support',
            params: { pivotLookback: 5, mergeThresholdPct: 0.5 },
          });
          indicators['sr.support'] = [...srSupport];

          const srResistance = this.indicators.compute(dataset.id, candleSeries, {
            source: 'support-resistance.resistance',
            params: { pivotLookback: 5, mergeThresholdPct: 0.5 },
          });
          indicators['sr.resistance'] = [...srResistance];
        } catch {
          // Safe fallback
        }
      }

      // If MA was not explicitly configured in candidate, compute baseline MA(20)
      if (!hasMa) {
        try {
          const ma20 = this.indicators.compute(dataset.id, candleSeries, {
            source: 'ma',
            params: { period: 20 },
          });
          indicators['ma.20'] = [...ma20];
        } catch {
          // Safe fallback
        }
      }
    }

    // 6. Map trades with 1-based sequential ordering
    const trades = rawTrades.map((t, index) => ({
      seq: index + 1,
      side: t.side,
      entryTime: t.entryTime,
      entryPrice: t.entryPrice,
      exitTime: t.exitTime,
      exitPrice: t.exitPrice,
      profit: t.profit,
    }));

    return {
      experimentId: evaluationResult.experimentId,
      dataset,
      spec: validatedSpec,
      metrics: evaluationResult.metrics,
      trades,
      candles: candleSeries.map((c) => ({
        pair: c.pair,
        timeframe: c.timeframe,
        openTime: c.openTime,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volume,
        closed: c.closed,
      })),
      indicators,
    };
  }
}
