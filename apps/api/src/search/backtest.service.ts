import { createHash } from 'node:crypto';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { canonicalSpec, EVENTS, type Dataset } from '@csl/contracts';
import { CandleRepository } from '../market/candle.repository';
import { IndicatorPort } from '../indicator/ports/indicator.port';
import { EvaluatorPort } from '../evaluation/ports/evaluator.port';
import { StrategyFactory } from './ports/strategy-factory.port';
import { BacktestRunner } from './ports/backtest-runner.port';
import { DatasetRepository } from './dataset.repository';
import { validateSpec } from './spec-validator';
import type { SingleRunRequestDto, SingleRunResponseDto } from './dto/single-run.dto';

const hash = (canonical: string): string => createHash('sha256').update(canonical).digest('hex');

@Injectable()
export class BacktestService {
  constructor(
    private readonly datasets: DatasetRepository,
    private readonly candles: CandleRepository,
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
    return this.datasets.create(data);
  }

  async runSingle(request: SingleRunRequestDto): Promise<SingleRunResponseDto> {
    let dataset: Dataset | null = null;

    if (request.datasetId) {
      dataset = await this.datasets.findById(request.datasetId);
      if (!dataset) {
        throw new NotFoundException(`Dataset "${request.datasetId}" not found`);
      }
    } else if (request.dataset) {
      dataset = await this.datasets.create(request.dataset);
    } else {
      throw new BadRequestException('Either datasetId or dataset definition must be provided');
    }

    const validatedSpec = validateSpec(request.spec);
    const specHash = hash(canonicalSpec(validatedSpec));

    // 1. Build strategy instance
    const strategy = await this.factory.build(validatedSpec);

    // 2. Run backtest simulation
    const rawTrades = await this.runner.run(strategy, dataset.id);

    // 3. Load candle bars for the dataset range
    const candleSeries = await this.candles.range(dataset.pair, dataset.timeframe, {
      from: dataset.from,
      to: dataset.to,
    });

    // 4. Evaluate metrics & persist to DB atomically via EvaluatorPort
    const evaluationResult = await this.evaluator.evaluateAndRecord({
      datasetId: dataset.id,
      spec: validatedSpec,
      specHash,
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

    // 5. Compute indicators for chart overlays (MA, Bollinger Bands, Support/Resistance)
    const indicators: Record<string, number[]> = {};
    if (candleSeries.length > 0) {
      try {
        const maFast = this.indicators.compute(dataset.id, candleSeries, {
          source: 'moving-average',
          params: { period: 20 },
        });
        indicators['ma.20'] = [...maFast];
      } catch {
        // Safe fallback
      }

      try {
        const bbUpper = this.indicators.compute(dataset.id, candleSeries, {
          source: 'bollinger-bands.upper',
          params: { period: 20, deviation: 2 },
        });
        indicators['bb.upper'] = [...bbUpper];

        const bbLower = this.indicators.compute(dataset.id, candleSeries, {
          source: 'bollinger-bands.lower',
          params: { period: 20, deviation: 2 },
        });
        indicators['bb.lower'] = [...bbLower];
      } catch {
        // Safe fallback
      }

      try {
        const srSupport = this.indicators.compute(dataset.id, candleSeries, {
          source: 'support-resistance.support',
          params: {},
        });
        indicators['sr.support'] = [...srSupport];

        const srResistance = this.indicators.compute(dataset.id, candleSeries, {
          source: 'support-resistance.resistance',
          params: {},
        });
        indicators['sr.resistance'] = [...srResistance];
      } catch {
        // Safe fallback
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
