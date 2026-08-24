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
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Lỗi HTTP ${r.status}`))))
      .then((health: Health) => setCheck({ kind: 'ready', health, at: Date.now() }))
      .catch((e: Error) => setCheck({ kind: 'error', message: e.message }));
  }, []);

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

          <section className="panel panel-compact">
            <div className="panel-head">
              <h2>Kiểm tra hệ thống</h2>
            </div>

            {check.kind === 'ready' && (
              <p className="source">
                kiểm tra một lần lúc {clock(check.at)} — tải lại trang để kiểm tra lại
              </p>
            )}

            {check.kind === 'loading' && <p className="state">Đang kiểm tra hệ thống…</p>}

            {check.kind === 'error' && (
              <p className="state bad">
                <strong>Không kết nối được API.</strong> {check.message} API có đang chạy
                không?{' '}
                <code>pnpm dev:api</code>
              </p>
            )}

            {check.kind === 'ready' && (
              <dl>
                <dt>API</dt>
                <dd className="ok">đang chạy</dd>

                <dt>Postgres</dt>
                <dd className={check.health.database === 'up' ? 'ok' : 'bad'}>
                  {check.health.database === 'up' ? 'đang chạy' : 'đang tắt'}
                  {check.health.database === 'down' && (
                    <span> — khởi động bằng <code>pnpm db:up</code></span>
                  )}
                </dd>

                <dt>Event bus</dt>
                <dd className={check.health.lastEventAt ? 'ok' : 'bad'}>
                  {check.health.lastEventAt
                    ? `round-trip thành công lúc ${check.health.lastEventAt}`
                    : 'chưa nhận được event nào'}
                </dd>

                <dt>Contract dùng chung</dt>
                <dd className="ok">
                  {TIMEFRAMES.length} timeframe, dùng chung cho cả hai phía:{' '}
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
