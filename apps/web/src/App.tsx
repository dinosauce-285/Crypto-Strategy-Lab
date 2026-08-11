import { useEffect, useState } from 'react';
import { TIMEFRAMES, type Timeframe } from '@csl/contracts';

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
  | { kind: 'ready'; health: Health };

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

  useEffect(() => {
    fetch('/api/health')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((health: Health) => setState({ kind: 'ready', health }))
      .catch((e: Error) => setState({ kind: 'error', message: e.message }));
  }, []);

  return (
    <main>
      <h1>Crypto Strategy Lab</h1>
      <p className="sub">Skeleton — T01. Nothing here is a feature yet.</p>

      {state.kind === 'loading' && <p>Checking the stack…</p>}

      {state.kind === 'error' && (
        <div className="bad">
          <strong>API unreachable.</strong> {state.message}
          <p>Is it running? <code>pnpm dev:api</code></p>
        </div>
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
