import { useState } from 'react';
import type { Timeframe } from '@csl/contracts';
import { Header } from '../layout/Header';
import { PairSelect, PAIRS } from '../market/PairSelect';
import { TimeframeSelect } from '../market/TimeframeSelect';
import { BacktestChart } from '../market/BacktestChart';

/**
 * A static read of stored history, not a live screen — no date picker or strategy
 * overlay yet, both separate later work (`backtest-history-chart`).
 */
export function BacktestScreen() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');

  return (
    <main className="screen">
      <Header title="Backtest" />
      <div className="screen-main">
        <div className="controls-row">
          <PairSelect value={pair} onChange={setPair} />
          <TimeframeSelect value={timeframe} onChange={setTimeframe} />
        </div>
        <BacktestChart pair={pair} timeframe={timeframe} />
      </div>
    </main>
  );
}
