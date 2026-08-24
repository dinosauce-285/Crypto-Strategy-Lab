import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { CandidateSpec, Dataset } from '@csl/contracts';
import { BacktestService } from './backtest.service';
import type { DatasetRepository } from './dataset.repository';
import type { CandleRepository } from '../market/candle.repository';
import type { CandleBackfillPort } from '../market/ports/candle-backfill.port';
import type { IndicatorPort } from '../indicator/ports/indicator.port';
import type { EvaluatorPort } from '../evaluation/ports/evaluator.port';
import type { StrategyFactory } from './ports/strategy-factory.port';
import type { BacktestRunner } from './ports/backtest-runner.port';

describe('BacktestService', () => {
  let service: BacktestService;
  let mockDatasets: jest.Mocked<DatasetRepository>;
  let mockCandles: jest.Mocked<CandleRepository>;
  let mockBackfill: jest.Mocked<CandleBackfillPort>;
  let mockIndicators: jest.Mocked<IndicatorPort>;
  let mockEvaluator: jest.Mocked<EvaluatorPort>;
  let mockFactory: jest.Mocked<StrategyFactory>;
  let mockRunner: jest.Mocked<BacktestRunner>;

  const sampleDataset: Dataset = {
    id: 'dataset-123',
    pair: 'BTCUSDT',
    timeframe: '1h',
    from: 1000,
    to: 5000,
    rules: {
      entryPrice: 'next-open',
      feeRate: '0.001',
      warmupCandles: 20,
      profitMode: 'compound',
      drawdownMode: 'trade-close',
    },
  };

  const sampleSpec: CandidateSpec = {
    rule: 'weighted',
    threshold: 0.5,
    members: [
      {
        id: 'sma-cross',
        version: 1,
        params: { fast: 10, slow: 20 },
        paramsHash: 'hash123',
        weight: 0.5,
      },
      {
        id: 'rsi-reversal',
        version: 1,
        params: { period: 14, overbought: 70, oversold: 30 },
        paramsHash: 'hash456',
        weight: 0.5,
      },
    ],
  };

  beforeEach(() => {
    mockDatasets = {
      findById: jest.fn().mockResolvedValue(sampleDataset),
      create: jest.fn().mockResolvedValue(sampleDataset),
      list: jest.fn().mockResolvedValue([sampleDataset]),
    } as unknown as jest.Mocked<DatasetRepository>;

    mockCandles = {
      range: jest.fn().mockResolvedValue([
        { pair: 'BTCUSDT', timeframe: '1h', openTime: 1000, open: '100', high: '105', low: '95', close: '102', volume: '10', closed: true },
      ]),
    } as unknown as jest.Mocked<CandleRepository>;

    mockBackfill = {
      ensureRange: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CandleBackfillPort>;

    mockIndicators = {
      compute: jest.fn().mockReturnValue([100]),
    } as unknown as jest.Mocked<IndicatorPort>;

    mockEvaluator = {
      computeMetrics: jest.fn(),
      evaluateAndRecord: jest.fn().mockResolvedValue({
        experimentId: 'exp-999',
        metrics: {
          totalReturn: 0.1,
          profitLoss: '10',
          winRate: 1.0,
          tradeCount: 1,
          maxDrawdown: 0,
        },
      }),
      recordFailed: jest.fn(),
    } as unknown as jest.Mocked<EvaluatorPort>;

    mockFactory = {
      build: jest.fn().mockResolvedValue({
        analyze: jest.fn(),
        warmup: 20,
      }),
    } as unknown as jest.Mocked<StrategyFactory>;

    mockRunner = {
      run: jest.fn().mockResolvedValue([
        { entryTime: 1000, entryPrice: '100', exitTime: 2000, exitPrice: '110', side: 'BUY', profit: '10' },
      ]),
    } as unknown as jest.Mocked<BacktestRunner>;

    const mockEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    service = new BacktestService(
      mockDatasets,
      mockCandles,
      mockBackfill,
      mockIndicators,
      mockEvaluator,
      mockFactory,
      mockRunner,
      mockEmitter,
    );
  });

  it('lists datasets from repository', async () => {
    const list = await service.listDatasets();
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe('dataset-123');
  });

  it('creates a dataset and fetches its candle range before returning it', async () => {
    const created = await service.createDataset({
      pair: sampleDataset.pair,
      timeframe: sampleDataset.timeframe,
      from: sampleDataset.from,
      to: sampleDataset.to,
      rules: sampleDataset.rules,
    });

    expect(created).toEqual(sampleDataset);
    expect(mockBackfill.ensureRange).toHaveBeenCalledWith(
      sampleDataset.pair,
      sampleDataset.timeframe,
      sampleDataset.from,
      sampleDataset.to,
    );
  });

  it('runs a single backtest and returns full result payload', async () => {
    const result = await service.runSingle({
      datasetId: 'dataset-123',
      spec: sampleSpec,
    });

    expect(result.experimentId).toBe('exp-999');
    expect(result.metrics.totalReturn).toBe(0.1);
    expect(result.trades).toHaveLength(1);
    expect(result.trades[0].seq).toBe(1);
    expect(result.candles).toHaveLength(1);
    expect(mockRunner.run).toHaveBeenCalled();
    expect(mockEvaluator.evaluateAndRecord).toHaveBeenCalled();
  });
});
