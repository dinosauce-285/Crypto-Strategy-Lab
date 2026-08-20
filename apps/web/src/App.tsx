import { useEffect, useState } from 'react';
import { TIMEFRAMES, type Timeframe } from '@csl/contracts';
import { MarketPanel, PAIRS } from './market/MarketPanel';
import { CandleChart } from './market/CandleChart';
import { clock } from './market/format';

interface Health {
  status: string;
  database: 'up' | 'down';
  eventBus: string;
  lastEventAt: string | null;
  contracts: { timeframes: readonly Timeframe[] };
}

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; health: Health; at: number };

/**
 * The T01 smoke screen: it proves the browser reaches the API, the API reaches
 * Postgres, the event bus round-trips, and both sides share one type package —
 * `TIMEFRAMES` below is imported from @csl/contracts, the same constant the API
 * returns.
 *
 * Every screen in this project shows all four states (see T04). This one does it
 * the crude way because there is no component set yet.
 */
export function App() {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((health: Health) => setState({ kind: 'ready', health, at: Date.now() }))
      .catch((e: Error) => setState({ kind: 'error', message: e.message }));
  }, []);

  return (
    <main>
      <h1>Crypto Strategy Lab</h1>
      <p className="sub">Slice 1 — the server pushes, the screen never asks twice.</p>

      <MarketPanel
        pair={pair}
        timeframe={timeframe}
        onPairChange={setPair}
        onTimeframeChange={setTimeframe}
      />
      <CandleChart pair={pair} timeframe={timeframe} />

      <h2 className="check-head">System check</h2>

      {state.kind === 'ready' && (
        <p className="source">
          one-time check at {clock(state.at)} — reload the page to run it again
        </p>
      )}

      {state.kind === 'loading' && <p className="state">Checking the stack…</p>}

      {state.kind === 'error' && (
        <p className="state bad">
          <strong>API unreachable.</strong> {state.message} Is it running?{' '}
          <code>pnpm dev:api</code>
        </p>
      )}

      {state.kind === 'ready' && (
        <dl>
          <dt>API</dt>
          <dd className="ok">up</dd>

          <dt>Postgres</dt>
          <dd className={state.health.database === 'up' ? 'ok' : 'bad'}>
            {state.health.database}
            {state.health.database === 'down' && (
              <span> — start it with <code>pnpm db:up</code></span>
            )}
          </dd>

          <dt>Event bus</dt>
          <dd className={state.health.lastEventAt ? 'ok' : 'bad'}>
            {state.health.lastEventAt ? `round-trip ok at ${state.health.lastEventAt}` : 'no event seen'}
          </dd>

          <dt>Shared contracts</dt>
          <dd className="ok">
            {TIMEFRAMES.length} timeframes, imported by both sides:{' '}
            {state.health.contracts.timeframes.join(' · ')}
          </dd>
        </dl>
      )}
    </main>
  );
}
