import { Injectable, Logger } from '@nestjs/common';
import type {
  StrategyContext,
  Signal,
  Trade,
  StrategyMeta,
} from '@csl/contracts';
import { BacktestRunner, UnknownDatasetError } from './ports/backtest-runner.port';
import type { RunnableStrategy } from './ports/strategy-factory.port';
import { DatasetRepository } from './dataset.repository';
import { CandleRepository } from '../market/candle.repository';
import { IndicatorPort } from '../indicator/ports/indicator.port';

interface StrategyExecutable {
  meta?: StrategyMeta;
  analyze(context: StrategyContext): Signal;
}

interface ActivePosition {
  side: 'BUY' | 'SELL';
  entryTime: number;
  entryPrice: number;
}

@Injectable()
export class BacktestRunnerService extends BacktestRunner {
  private readonly logger = new Logger(BacktestRunnerService.name);

  constructor(
    private readonly datasets: DatasetRepository,
    private readonly candles: CandleRepository,
    private readonly indicators: IndicatorPort,
  ) {
    super();
  }

  async run(strategy: RunnableStrategy, datasetId: string): Promise<Trade[]> {
    const dataset = await this.datasets.findById(datasetId);
    if (!dataset) {
      throw new UnknownDatasetError(datasetId);
    }

    const executable = strategy as StrategyExecutable;
    if (typeof executable.analyze !== 'function') {
      throw new Error('Provided strategy is not executable: missing analyze method');
    }

    const declaredWarmup = executable.meta?.warmup ?? 0;
    const effectiveWarmup = Math.max(dataset.rules.warmupCandles, declaredWarmup);

    const candleSeries = await this.candles.range(dataset.pair, dataset.timeframe, {
      from: dataset.from,
      to: dataset.to,
    });

    if (candleSeries.length === 0) {
      return [];
    }

    const feeRate = parseFloat(dataset.rules.feeRate) || 0;
    const isNextOpen = dataset.rules.entryPrice === 'next-open';
    const trades: Trade[] = [];

    let currentPosition: ActivePosition | null = null;
    let pendingSignal: Signal | null = null;

    for (let i = 0; i < candleSeries.length; i++) {
      const currentCandle = candleSeries[i];
      const candleOpenPrice = parseFloat(currentCandle.open);
      const candleClosePrice = parseFloat(currentCandle.close);

      // If 'next-open' rule is enabled and we had a pending signal from step i-1:
      if (isNextOpen && pendingSignal && i >= effectiveWarmup) {
        currentPosition = this.processAction(
          pendingSignal,
          candleOpenPrice,
          currentCandle.openTime,
          currentPosition,
          feeRate,
          trades,
        );
        pendingSignal = null;
      }

      // Strictly causal StrategyContext: strategy only sees candles up to current index i
      const context: StrategyContext = {
        candles: candleSeries.slice(0, i + 1),
        index: i,
        get: (request) => this.indicators.compute(datasetId, candleSeries, request),
      };

      const signal = executable.analyze(context);

      if (i < effectiveWarmup) {
        continue;
      }

      if (isNextOpen) {
        // Schedule signal for next candle's open
        if (signal.direction === 'BUY' || signal.direction === 'SELL') {
          pendingSignal = signal;
        }
      } else {
        // 'signal-close': execute immediately on current candle's close price
        if (signal.direction === 'BUY' || signal.direction === 'SELL') {
          currentPosition = this.processAction(
            signal,
            candleClosePrice,
            currentCandle.openTime,
            currentPosition,
            feeRate,
            trades,
          );
        }
      }
    }

    // Close any position remaining open at the last candle
    if (currentPosition) {
      const lastCandle = candleSeries[candleSeries.length - 1];
      const exitPrice = parseFloat(lastCandle.close);
      this.closePosition(currentPosition, exitPrice, lastCandle.openTime, feeRate, trades);
    }

    return trades;
  }

  private processAction(
    signal: Signal,
    price: number,
    time: number,
    currentPosition: ActivePosition | null,
    feeRate: number,
    trades: Trade[],
  ): ActivePosition | null {
    if (!currentPosition) {
      // Flat -> Open new position
      return {
        side: signal.direction === 'BUY' ? 'BUY' : 'SELL',
        entryTime: time,
        entryPrice: price,
      };
    }

    if (currentPosition.side === signal.direction) {
      // Same direction -> Hold current position
      return currentPosition;
    }

    // Reversal / Opposite signal -> Close existing position and open new one
    this.closePosition(currentPosition, price, time, feeRate, trades);
    return {
      side: signal.direction === 'BUY' ? 'BUY' : 'SELL',
      entryTime: time,
      entryPrice: price,
    };
  }

  private closePosition(
    position: ActivePosition,
    exitPrice: number,
    exitTime: number,
    feeRate: number,
    trades: Trade[],
  ): void {
    const grossReturn =
      position.side === 'BUY'
        ? (exitPrice - position.entryPrice) / position.entryPrice
        : (position.entryPrice - exitPrice) / position.entryPrice;

    // Total fees: entry fee + exit fee (both sides deducted)
    const totalFee = 2 * feeRate;
    const netProfit = grossReturn - totalFee;

    trades.push({
      entryTime: position.entryTime,
      entryPrice: position.entryPrice.toString(),
      exitTime,
      exitPrice: exitPrice.toString(),
      side: position.side,
      profit: netProfit.toFixed(8),
    });
  }
}
