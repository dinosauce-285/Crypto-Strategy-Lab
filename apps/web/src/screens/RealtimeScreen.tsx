import { useState } from 'react';
import type { Timeframe } from '@csl/contracts';
import { Header } from '../layout/Header';
import { PairSelect, PAIRS } from '../market/PairSelect';
import { Dashboard } from '../market/Dashboard';
import { TimeframeSelect } from '../market/TimeframeSelect';
import { RecentTicks } from '../market/RecentTicks';
import { Annotations } from '../market/Annotations';

// Reading order of the 2x2 grid: [5m, 15m] on row one, [1h, 4h] on row two.
const DEFAULT_LAYOUT: Timeframe[] = ['5m', '15m', '1h', '4h'];

export function RealtimeScreen() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframes, setTimeframes] = useState<Timeframe[]>(DEFAULT_LAYOUT);
  const [selected, setSelected] = useState(0);

  const setSelectedTimeframe = (timeframe: Timeframe) => {
    setTimeframes((prev) => prev.map((t, i) => (i === selected ? timeframe : t)));
  };

  return (
    <main className="screen">
      <Header title="Biểu đồ Realtime - Nhiều khung thời gian" />

      <div className="screen-body">
        <div className="screen-main">
          <div className="controls-row">
            <PairSelect value={pair} onChange={setPair} />
            <TimeframeSelect value={timeframes[selected]} onChange={setSelectedTimeframe} />
          </div>
          <Dashboard pair={pair} timeframes={timeframes} selected={selected} onSelect={setSelected} />
        </div>

        <div className="screen-side">
          <RecentTicks pair={pair} />
          <Annotations pair={pair} />
        </div>
      </div>
    </main>
  );
}
