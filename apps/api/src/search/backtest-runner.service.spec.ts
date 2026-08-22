import { strictEqual, deepStrictEqual, rejects } from 'node:assert';
import type {
  Candle,
  Dataset,
  DataRequest,
  Signal,
  StrategyContext,
} from '@csl/contracts';
import { BacktestRunnerService } from './backtest-runner.service';
import { UnknownDatasetError } from './ports/backtest-runner.port';
import type { DatasetRepository } from './dataset.repository';
import type { CandleRepository } from '../market/candle.repository';
import type { IndicatorPort } from '../indicator/ports/indicator.port';

import type { RunnableStrategy } from './ports/strategy-factory.port';

function createMockCandle(time: number, open: number, high: number, low: number, close: number): Candle {
  return {
    pair: 'BTCUSDT',
    timeframe: '1h',
    openTime: time,
    open: open.toString(),
    high: high.toString(),
    low: low.toString(),
    close: close.toString(),
    volume: '100',
    closed: true,
  };
}

function createMockRunnableStrategy(
  analyze: (context: StrategyContext) => Signal,
  warmup = 0,
): RunnableStrategy {
  return {
    spec: { rule: 'weighted', threshold: 0.5, members: [] },
    warmup,
    requires: () => [],
    analyze,
  };
}

describe('BacktestRunnerService (T12)', () => {
  function setup(candles: Candle[], dataset?: Dataset) {
    const mockDataset: Dataset = dataset ?? {
      id: 'dataset-1',
      pair: 'BTCUSDT',
      timeframe: '1h',
      from: 1000,
      to: 5000,
      rules: {
        entryPrice: 'next-open',
        feeRate: '0.001',
        warmupCandles: 2,
        profitMode: 'simple',
        drawdownMode: 'trade-close',
      },
    };

    const mockDatasetRepo = {
      findById: async (id: string) => (id === mockDataset.id ? mockDataset : null),
      create: async () => mockDataset,
    } as unknown as DatasetRepository;

    const mockCandleRepo = {
      range: async () => candles,
      hasHistory: async () => true,
      upsert: async () => {},
      upsertMany: async () => {},
      onCandleClosed: async () => {},
    } as unknown as CandleRepository;

    const mockIndicatorPort: IndicatorPort = {
      compute: (_datasetId: string, _candles: readonly Candle[], _request: DataRequest) => [],
    };

    const service = new BacktestRunnerService(
      mockDatasetRepo,
      mockCandleRepo,
      mockIndicatorPort,
    );

    return { service, mockDataset };
  }

  it('throws UnknownDatasetError when dataset does not exist', async () => {
    const { service } = setup([]);
    await rejects(
      () => service.run(createMockRunnableStrategy(() => ({ direction: 'HOLD', strength: 0 })), 'non-existent-id'),
      (err: Error) => err instanceof UnknownDatasetError,
    );
  });

  it('returns empty array when candle series is empty', async () => {
    const { service } = setup([]);
    const strategy = createMockRunnableStrategy(() => ({ direction: 'BUY', strength: 1 }));
    const trades = await service.run(strategy, 'dataset-1');
    deepStrictEqual(trades, []);
  });

  it('strictly enforces causality and executes deterministically across runs (brief section 36)', async () => {
    const candles = [
      createMockCandle(1000, 100, 105, 95, 102), // index 0 (warmup)
      createMockCandle(2000, 102, 108, 100, 106), // index 1 (warmup)
      createMockCandle(3000, 106, 110, 104, 108), // index 2 -> BUY signal emitted
      createMockCandle(4000, 110, 115, 108, 112), // index 3 -> entry executed at open 110 -> SELL signal emitted
      createMockCandle(5000, 112, 118, 110, 115), // index 4 -> exit executed at open 112
    ];

    const { service } = setup(candles);

    const observedLengths: number[] = [];
    const strategy = createMockRunnableStrategy((context: StrategyContext): Signal => {
      // Assert causality: strategy never sees future candles
      observedLengths.push(context.candles.length);
      strictEqual(context.candles.length, context.index + 1);

      if (context.index === 2) return { direction: 'BUY', strength: 0.8 };
      if (context.index === 3) return { direction: 'SELL', strength: 0.8 };
      return { direction: 'HOLD', strength: 0 };
    });

    const run1 = await service.run(strategy, 'dataset-1');
    const run2 = await service.run(strategy, 'dataset-1');

    // Determinism: both runs must produce identical results
    deepStrictEqual(run1, run2);
    strictEqual(run1.length, 2); // 1 BUY trade + 1 SELL trade (closed at end)
  });

  it('correctly calculates entry prices, exit prices, and fee deductions', async () => {
    // feeRate = 0.001 (0.1% per side)
    const candles = [
      createMockCandle(1000, 100, 105, 95, 100), // idx 0 (warmup)
      createMockCandle(2000, 100, 105, 95, 100), // idx 1 (warmup)
      createMockCandle(3000, 100, 105, 95, 100), // idx 2 -> BUY signal
      createMockCandle(4000, 100, 110, 98, 105), // idx 3 -> Enter at open=100 -> SELL signal
      createMockCandle(5000, 110, 115, 108, 110), // idx 4 -> Exit BUY at open=110, Enter SELL at open=110
    ];

    const dataset: Dataset = {
      id: 'dataset-fees',
      pair: 'BTCUSDT',
      timeframe: '1h',
      from: 1000,
      to: 5000,
      rules: {
        entryPrice: 'next-open',
        feeRate: '0.001',
        warmupCandles: 2,
        profitMode: 'simple',
        drawdownMode: 'trade-close',
      },
    };

    const { service } = setup(candles, dataset);

    const strategy = createMockRunnableStrategy((context: StrategyContext): Signal => {
      if (context.index === 2) return { direction: 'BUY', strength: 1 };
      if (context.index === 3) return { direction: 'SELL', strength: 1 };
      return { direction: 'HOLD', strength: 0 };
    });

    const trades = await service.run(strategy, 'dataset-fees');

    // First trade: BUY at 4000 (open=100), closed at 5000 (open=110)
    // Gross return = (110 - 100) / 100 = 0.10 (10%)
    // Fee = 2 * 0.001 = 0.002
    // Net profit = 0.10 - 0.002 = 0.09800000
    const buyTrade = trades[0];
    strictEqual(buyTrade.side, 'BUY');
    strictEqual(buyTrade.entryTime, 4000);
    strictEqual(buyTrade.entryPrice, '100');
    strictEqual(buyTrade.exitTime, 5000);
    strictEqual(buyTrade.exitPrice, '110');
    strictEqual(buyTrade.profit, '0.09800000');
  });

  it('supports signal-close entry price mode', async () => {
    const candles = [
      createMockCandle(1000, 100, 105, 95, 102), // idx 0 (warmup)
      createMockCandle(2000, 102, 108, 100, 105), // idx 1 -> BUY at close=105
      createMockCandle(3000, 105, 115, 104, 110), // idx 2 -> SELL at close=110
    ];

    const dataset: Dataset = {
      id: 'dataset-close',
      pair: 'BTCUSDT',
      timeframe: '1h',
      from: 1000,
      to: 3000,
      rules: {
        entryPrice: 'signal-close',
        feeRate: '0',
        warmupCandles: 1,
        profitMode: 'simple',
        drawdownMode: 'trade-close',
      },
    };

    const { service } = setup(candles, dataset);

    const strategy = createMockRunnableStrategy((context: StrategyContext): Signal => {
      if (context.index === 1) return { direction: 'BUY', strength: 1 };
      if (context.index === 2) return { direction: 'SELL', strength: 1 };
      return { direction: 'HOLD', strength: 0 };
    });

    const trades = await service.run(strategy, 'dataset-close');
    strictEqual(trades.length, 2);

    const firstTrade = trades[0];
    strictEqual(firstTrade.entryTime, 2000);
    strictEqual(firstTrade.entryPrice, '105');
    strictEqual(firstTrade.exitTime, 3000);
    strictEqual(firstTrade.exitPrice, '110');
  });

  it('respects strategy declared warmup metadata when higher than dataset warmup', async () => {
    const candles = [
      createMockCandle(1000, 100, 105, 95, 100),
      createMockCandle(2000, 100, 105, 95, 100),
      createMockCandle(3000, 100, 105, 95, 100),
      createMockCandle(4000, 100, 105, 95, 100),
      createMockCandle(5000, 100, 105, 95, 100),
    ];

    const dataset: Dataset = {
      id: 'dataset-warmup',
      pair: 'BTCUSDT',
      timeframe: '1h',
      from: 1000,
      to: 5000,
      rules: {
        entryPrice: 'signal-close',
        feeRate: '0',
        warmupCandles: 1, // dataset says 1
        profitMode: 'simple',
        drawdownMode: 'trade-close',
      },
    };

    const { service } = setup(candles, dataset);

    const strategy = createMockRunnableStrategy((context: StrategyContext): Signal => {
      // Signals emitted at index 0, 1, 2 should be skipped due to strategy warmup 3
      if (context.index < 3) return { direction: 'BUY', strength: 1 };
      if (context.index === 3) return { direction: 'BUY', strength: 1 };
      return { direction: 'HOLD', strength: 0 };
    }, 3);

    const trades = await service.run(strategy, 'dataset-warmup');
    // Only index 3 signal takes effect
    strictEqual(trades.length, 1);
    strictEqual(trades[0].entryTime, 4000);
  });
});
