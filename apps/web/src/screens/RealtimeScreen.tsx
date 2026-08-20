import { useEffect, useState } from 'react';
import { TIMEFRAMES, type Timeframe } from '@csl/contracts';
import { Header } from '../layout/Header';
import { PairSelect, PAIRS } from '../market/PairSelect';
import { Dashboard } from '../market/Dashboard';
import { TimeframeSelect } from '../market/TimeframeSelect';
import { RecentTicks } from '../market/RecentTicks';
import { Annotations } from '../market/Annotations';
import { clock } from '../market/format';

// Reading order of the 2x2 grid: [5m, 15m] on row one, [1h, 4h] on row two.
const DEFAULT_LAYOUT: Timeframe[] = ['5m', '15m', '1h', '4h'];

interface Health {
  status: string;
  database: 'up' | 'down';
  eventBus: string;
  lastEventAt: string | null;
  contracts: { timeframes: readonly Timeframe[] };
}

type CheckState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; health: Health; at: number };

export function RealtimeScreen() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframes, setTimeframes] = useState<Timeframe[]>(DEFAULT_LAYOUT);
  const [selected, setSelected] = useState(0);
  const [check, setCheck] = useState<CheckState>({ kind: 'loading' });

  const setSelectedTimeframe = (timeframe: Timeframe) => {
    setTimeframes((prev) => prev.map((t, i) => (i === selected ? timeframe : t)));
  };

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((health: Health) => setCheck({ kind: 'ready', health, at: Date.now() }))
      .catch((e: Error) => setCheck({ kind: 'error', message: e.message }));
  }, []);

  return (
    <main className="screen">
      <Header title="Realtime Chart - Multi-timeframe" />

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

          <section className="panel panel-compact">
            <div className="panel-head">
              <h2>System check</h2>
            </div>

            {check.kind === 'ready' && (
              <p className="source">
                one-time check at {clock(check.at)} — reload the page to run it again
              </p>
            )}

            {check.kind === 'loading' && <p className="state">Checking the stack…</p>}

            {check.kind === 'error' && (
              <p className="state bad">
                <strong>API unreachable.</strong> {check.message} Is it running?{' '}
                <code>pnpm dev:api</code>
              </p>
            )}

            {check.kind === 'ready' && (
              <dl>
                <dt>API</dt>
                <dd className="ok">up</dd>

                <dt>Postgres</dt>
                <dd className={check.health.database === 'up' ? 'ok' : 'bad'}>
                  {check.health.database}
                  {check.health.database === 'down' && (
                    <span> — start it with <code>pnpm db:up</code></span>
                  )}
                </dd>

                <dt>Event bus</dt>
                <dd className={check.health.lastEventAt ? 'ok' : 'bad'}>
                  {check.health.lastEventAt
                    ? `round-trip ok at ${check.health.lastEventAt}`
                    : 'no event seen'}
                </dd>

                <dt>Shared contracts</dt>
                <dd className="ok">
                  {TIMEFRAMES.length} timeframes, imported by both sides:{' '}
                  {check.health.contracts.timeframes.join(' · ')}
                </dd>
              </dl>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
