import type { BacktestRules, CandidateSpec, Trade } from '@csl/contracts';
import { EvaluationRepository } from './evaluation.repository';
import { EvaluatorService } from './evaluator.service';

describe('EvaluatorService', () => {
  let service: EvaluatorService;
  let repository: jest.Mocked<EvaluationRepository>;

  const defaultRules: BacktestRules = {
    entryPrice: 'next-open',
    feeRate: '0.001',
    warmupCandles: 50,
    profitMode: 'compound',
    drawdownMode: 'trade-close',
  };

  const sampleSpec: CandidateSpec = {
    rule: 'weighted',
    threshold: 0.5,
    members: [
      {
        id: 'sma-cross',
        version: 1,
        params: { fast: 10, slow: 20 },
        paramsHash: 'hash-sma',
        weight: 1.0,
      },
    ],
  };

  beforeEach(() => {
    repository = {
      isRecorded: jest.fn(),
      recordCompleted: jest.fn(),
      recordFailed: jest.fn(),
    } as unknown as jest.Mocked<EvaluationRepository>;

    service = new EvaluatorService(repository);
  });

  it('computes metrics purely without calling repository', () => {
    const trades: Trade[] = [
      { entryTime: 1000, entryPrice: '100', exitTime: 2000, exitPrice: '110', side: 'BUY', profit: '10' },
    ];

    const metrics = service.computeMetrics(trades, defaultRules);
    expect(metrics.totalReturn).toBeCloseTo(0.1);
    expect(metrics.tradeCount).toBe(1);
    expect(metrics.winRate).toBe(1.0);
    expect(metrics.profitLoss).toBe('10');
    expect(repository.recordCompleted).not.toHaveBeenCalled();
  });

  it('evaluates and persists completed experiment atomically', async () => {
    const trades: Trade[] = [
      { entryTime: 1000, entryPrice: '100', exitTime: 2000, exitPrice: '110', side: 'BUY', profit: '10' },
      { entryTime: 3000, entryPrice: '110', exitTime: 4000, exitPrice: '105', side: 'BUY', profit: '-5' },
    ];

    repository.recordCompleted.mockResolvedValue('exp-123');

    const result = await service.evaluateAndRecord({
      datasetId: 'dataset-1',
      spec: sampleSpec,
      specHash: 'hash-abc',
      rules: defaultRules,
      trades,
    });

    expect(result.experimentId).toBe('exp-123');
    expect(result.metrics.tradeCount).toBe(2);
    expect(result.metrics.winRate).toBe(0.5);
    expect(repository.recordCompleted).toHaveBeenCalledWith(
      expect.objectContaining({
        datasetId: 'dataset-1',
        spec: sampleSpec,
        specHash: 'hash-abc',
        trades,
      }),
    );
  });

  it('records failed experiment runs', async () => {
    repository.recordFailed.mockResolvedValue(true);

    const recorded = await service.recordFailed('dataset-1', sampleSpec, 'hash-abc', 'Execution error');
    expect(recorded).toBe(true);
    expect(repository.recordFailed).toHaveBeenCalledWith({
      datasetId: 'dataset-1',
      spec: sampleSpec,
      specHash: 'hash-abc',
      error: 'Execution error',
    });
  });
});
