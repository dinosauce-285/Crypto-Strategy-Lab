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

    // 5. Compute indicators for chart overlays (MA, Bollinger Bands, RSI)
    const indicators: Record<string, number[]> = {};
    if (candleSeries.length > 0) {
      try {
        // Collect indicators requested by the strategy or default overlays
        const maFast = this.indicators.compute(dataset.id, candleSeries, {
          source: 'moving-average',
          params: { period: 20 },
        });
        indicators['ma.20'] = [...maFast];

        const bb = this.indicators.compute(dataset.id, candleSeries, {
          source: 'bollinger-bands',
          params: { period: 20, deviation: 2 },
        }) as Record<string, unknown> | readonly number[];
        if (bb && typeof bb === 'object') {
          const upper = 'upper' in bb ? bb.upper : bb;
          const middle = 'middle' in bb ? bb.middle : bb;
          const lower = 'lower' in bb ? bb.lower : bb;
          if (Array.isArray(upper)) indicators['bb.upper'] = [...upper];
          if (Array.isArray(middle)) indicators['bb.middle'] = [...middle];
          if (Array.isArray(lower)) indicators['bb.lower'] = [...lower];
        }
      } catch {
        // Safe fallback if optional indicator calculator throws
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
