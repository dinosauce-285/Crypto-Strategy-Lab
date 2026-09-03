import type { Dataset } from '@csl/contracts';
import { BacktestController } from './backtest.controller';
import type { BacktestService } from './backtest.service';
import { InvalidDatasetError } from './dataset-validator';

describe('BacktestController', () => {
  let controller: BacktestController;
  let service: jest.Mocked<BacktestService>;

  const sampleDataset: Dataset = {
    id: 'dataset-1',
    pair: 'BTCUSDT',
    timeframe: '1h',
    from: 1700000000000,
    to: 1700100000000,
    rules: {
      entryPrice: 'next-open',
      feeRate: '0.001',
      warmupCandles: 20,
      profitMode: 'compound',
      drawdownMode: 'trade-close',
    },
  };

  beforeEach(() => {
    service = {
      listDatasets: jest.fn().mockResolvedValue([sampleDataset]),
      getDataset: jest.fn().mockResolvedValue(sampleDataset),
      createDataset: jest.fn().mockResolvedValue(sampleDataset),
      deleteDataset: jest.fn().mockResolvedValue(sampleDataset),
      runSingle: jest.fn(),
    } as unknown as jest.Mocked<BacktestService>;

    controller = new BacktestController(service);
  });

  it('lists datasets', async () => {
    const list = await controller.listDatasets();
    expect(list).toEqual([sampleDataset]);
    expect(service.listDatasets).toHaveBeenCalled();
  });

  it('gets one dataset', async () => {
    await expect(controller.getDataset('dataset-1')).resolves.toEqual(sampleDataset);
    expect(service.getDataset).toHaveBeenCalledWith('dataset-1');
  });

  it('creates dataset with valid payload', async () => {
    const payload = {
      pair: 'BTCUSDT',
      timeframe: '1h',
      from: 1700000000000,
      to: 1700100000000,
      rules: {
        entryPrice: 'next-open',
        feeRate: '0.001',
        warmupCandles: 20,
        profitMode: 'compound',
        drawdownMode: 'trade-close',
      },
    };

    const result = await controller.createDataset(payload);
    expect(result).toEqual(sampleDataset);
    expect(service.createDataset).toHaveBeenCalledWith(payload);
  });

  it('deletes one dataset', async () => {
    await expect(controller.deleteDataset('dataset-1')).resolves.toEqual(sampleDataset);
    expect(service.deleteDataset).toHaveBeenCalledWith('dataset-1');
  });

  it('throws InvalidDatasetError on invalid dataset parameters', async () => {
    const invalidPayload = {
      pair: 'BTCUSDT',
      timeframe: '1h',
      from: 1700000000000,
      to: 1700100000000,
      rules: {
        entryPrice: 'whatever',
        feeRate: '-5',
        warmupCandles: -10,
        profitMode: 'nonsense',
        drawdownMode: 'garbage',
      },
    };

    await expect(() => controller.createDataset(invalidPayload)).toThrow(InvalidDatasetError);
    expect(service.createDataset).not.toHaveBeenCalled();
  });

  it('translates InvalidSpecError to BadRequestException in runBacktest', async () => {
    const { InvalidSpecError } = await import('./spec-validator');
    service.runSingle.mockRejectedValueOnce(new InvalidSpecError('member weights sum to 0, not 1'));

    await expect(
      controller.runBacktest({
        datasetId: 'dataset-1',
        spec: { rule: 'weighted', threshold: 0.5, members: [] },
      }),
    ).rejects.toThrow('member weights sum to 0, not 1');
  });
});
