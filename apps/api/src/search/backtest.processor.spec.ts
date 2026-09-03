import type { Job } from 'bullmq';
import type { BacktestJob, CandidateSpec, Dataset } from '@csl/contracts';
import { BacktestProcessor, MissingPortError } from './backtest.processor';
import type { DatasetRepository } from './dataset.repository';
import type { CandleRepository } from '../market/candle.repository';
import type { EvaluatorPort } from '../evaluation/ports/evaluator.port';
import type { StrategyFactory } from './ports/strategy-factory.port';
import type { BacktestRunner } from './ports/backtest-runner.port';
import type { JobOutcome } from './job-outcome';

describe('BacktestProcessor', () => {
  let processor: BacktestProcessor;
  let mockDatasets: jest.Mocked<DatasetRepository>;
  let mockCandles: jest.Mocked<CandleRepository>;
  let mockFactory: jest.Mocked<StrategyFactory>;
  let mockRunner: jest.Mocked<BacktestRunner>;
  let mockEvaluator: jest.Mocked<EvaluatorPort>;

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
        weight: 1.0,
      },
    ],
  };

  const makeJob = (): Job<BacktestJob, JobOutcome> =>
    ({
      data: { spec: sampleSpec, datasetId: 'dataset-123' },
      attemptsStarted: 1,
      opts: { attempts: 1 },
    }) as unknown as Job<BacktestJob, JobOutcome>;

  beforeEach(() => {
    mockDatasets = {
      findById: jest.fn().mockResolvedValue(sampleDataset),
      acquireLease: jest.fn().mockResolvedValue(true),
      releaseLease: jest.fn().mockResolvedValue(undefined),
      renewLease: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<DatasetRepository>;

    mockCandles = {
      range: jest.fn().mockResolvedValue([
        { pair: 'BTCUSDT', timeframe: '1h', openTime: 1000, open: '100', high: '105', low: '95', close: '102', volume: '10', closed: true },
      ]),
    } as unknown as jest.Mocked<CandleRepository>;

    mockFactory = {
      build: jest.fn().mockResolvedValue({ analyze: jest.fn(), warmup: 20 }),
    } as unknown as jest.Mocked<StrategyFactory>;

    mockRunner = {
      run: jest.fn().mockResolvedValue([
        { entryTime: 1000, entryPrice: '100', exitTime: 2000, exitPrice: '110', side: 'BUY', profit: '10' },
      ]),
    } as unknown as jest.Mocked<BacktestRunner>;

    mockEvaluator = {
      isRecorded: jest.fn().mockResolvedValue(false),
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
      recordFailed: jest.fn().mockResolvedValue(true),
    } as unknown as jest.Mocked<EvaluatorPort>;

    processor = new BacktestProcessor(mockDatasets, mockCandles, mockFactory, mockRunner, mockEvaluator);
  });

  it('checks for a duplicate, builds, runs, and evaluates through EvaluatorPort in order', async () => {
    const outcome = await processor.process(makeJob());

    expect(outcome.status).toBe('completed');
    expect(outcome.experimentId).toBe('exp-999');

    const callOrder = [
      mockEvaluator.isRecorded.mock.invocationCallOrder[0],
      mockFactory.build.mock.invocationCallOrder[0],
      mockRunner.run.mock.invocationCallOrder[0],
      mockDatasets.findById.mock.invocationCallOrder[0],
      mockCandles.range.mock.invocationCallOrder[0],
      mockEvaluator.evaluateAndRecord.mock.invocationCallOrder[0],
    ];
    expect(callOrder).toEqual([...callOrder].sort((a, b) => a - b));

    expect(mockEvaluator.evaluateAndRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: 'dataset-123',
        rules: sampleDataset.rules,
      }),
    );
  });

  it('skips build and run when the candidate is already recorded', async () => {
    mockEvaluator.isRecorded.mockResolvedValue(true);

    const outcome = await processor.process(makeJob());

    expect(outcome.status).toBe('duplicate');
    expect(mockFactory.build).not.toHaveBeenCalled();
    expect(mockRunner.run).not.toHaveBeenCalled();
  });

  it('uses a fresh lease for each attempt of the same job', async () => {
    await processor.process(makeJob());
    await processor.process(makeJob());

    const leaseIds = mockDatasets.acquireLease.mock.calls.map(([, leaseId]) => leaseId);
    expect(leaseIds).toHaveLength(2);
    expect(leaseIds[0]).not.toBe(leaseIds[1]);
  });

  it('records a final failure before releasing the active Dataset lease', async () => {
    mockRunner.run.mockRejectedValue(new Error('runner failed'));

    await expect(processor.process(makeJob())).rejects.toThrow('runner failed');

    expect(mockEvaluator.recordFailed).toHaveBeenCalledWith(
      'dataset-123',
      sampleSpec,
      expect.any(String),
      'runner failed',
    );
    expect(mockDatasets.releaseLease).toHaveBeenCalledTimes(1);
    expect(mockEvaluator.recordFailed.mock.invocationCallOrder[0]).toBeLessThan(
      mockDatasets.releaseLease.mock.invocationCallOrder[0],
    );
  });

  it('fails the job permanently with MissingPortError and records nothing when EvaluatorPort is unbound', async () => {
    processor = new BacktestProcessor(mockDatasets, mockCandles, mockFactory, mockRunner, undefined);

    await expect(processor.process(makeJob())).rejects.toThrow(
      new MissingPortError('EvaluatorPort', 'T13').message,
    );
    expect(mockEvaluator.recordFailed).not.toHaveBeenCalled();
  });
});
