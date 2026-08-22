import { useState } from 'react';
import type { Dataset, StrategyMeta, StrategyParams, Timeframe } from '@csl/contracts';
import { Header } from '../layout/Header';
import { DatasetPicker } from '../backtest/DatasetPicker';
import { DatasetFormModal } from '../backtest/DatasetFormModal';
import { StrategyPicker } from '../backtest/StrategyPicker';
import { SingleRunChart } from '../backtest/SingleRunChart';
import { MetricsPanel } from '../backtest/MetricsPanel';
import { TradesTable } from '../backtest/TradesTable';

interface TradeRow {
  seq: number;
  side: 'BUY' | 'SELL';
  entryTime: number;
  entryPrice: string;
  exitTime: number;
  exitPrice: string;
  profit: string;
}

interface SingleRunResult {
  experimentId?: string;
  dataset: Dataset;
  metrics: {
    totalReturn: number;
    profitLoss: string;
    winRate: number;
    tradeCount: number;
    maxDrawdown: number;
    profitFactor?: number;
    sharpeRatio?: number;
  };
  trades: TradeRow[];
  candles: Array<{
    pair: string;
    timeframe: Timeframe;
    openTime: number;
    open: string;
    high: string;
    low: string;
    close: string;
    volume: string;
    closed: boolean;
  }>;
  indicators: Record<string, number[]>;
}

type RunState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; result: SingleRunResult };

export function BacktestScreen() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [strategy, setStrategy] = useState<StrategyMeta | null>(null);
  const [params, setParams] = useState<StrategyParams>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [state, setState] = useState<RunState>({ kind: 'idle' });
  const [selectedTrade, setSelectedTrade] = useState<TradeRow | null>(null);

  const handleStrategySelect = (meta: StrategyMeta, defaultParams: StrategyParams) => {
    setStrategy(meta);
    setParams(defaultParams);
  };

  const handleRun = async () => {
    if (!dataset || !strategy) return;
    setState({ kind: 'loading' });
    setSelectedTrade(null);

    try {
      const payload = {
        datasetId: dataset.id,
        spec: {
          rule: 'weighted',
          threshold: 0.5,
          members: [
            {
              id: strategy.id,
              version: strategy.version,
              params,
              paramsHash: 'single-run-hash',
              weight: 0.5,
            },
            {
              id: strategy.id,
              version: strategy.version,
              params,
              paramsHash: 'single-run-hash',
              weight: 0.5,
            },
          ],
        },
      };

      const res = await fetch('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Backtest execution failed: HTTP ${res.status}`);
      }

      const body: SingleRunResult = await res.json();
      setState({ kind: 'ready', result: body });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message });
    }
  };

  return (
    <main className="screen">
      <Header title="Strategy Backtest" />

      <div className="screen-body">
        {/* Left Column: Visual Chart & Analysis Panels */}
        <div className="screen-main">
          {state.kind === 'idle' && (
            <div
              className="panel"
              style={{
                minHeight: '360px',
                border: '1px dashed var(--line)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <p className="state" style={{ maxWidth: '48ch', lineHeight: '1.5' }}>
                Select a dataset and strategy on the right, then press <strong>▶ Run Backtest</strong> to simulate execution, plot candlestick charts with indicators, and inspect trade performance metrics.
              </p>
            </div>
          )}

          {state.kind === 'loading' && (
            <div
              className="panel"
              style={{
                minHeight: '360px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <p className="state">Executing backtest simulation & computing metrics…</p>
            </div>
          )}

          {state.kind === 'error' && (
            <div
              className="panel"
              style={{
                minHeight: '360px',
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <p className="state bad" style={{ marginBottom: '0.75rem' }}>
                <strong>Simulation Failed.</strong> {state.message}
              </p>
              <button type="button" className="btn-action" onClick={handleRun}>
                Retry
              </button>
            </div>
          )}

          {state.kind === 'ready' && (
            <>
              <div className="panel">
                <div className="panel-head">
                  <h2>
                    {state.result.dataset.pair} · {state.result.dataset.timeframe} (
                    {state.result.candles.length} candles)
                  </h2>
                  <span className="source">
                    Experiment ID: <code>{state.result.experimentId ?? 'ephemeral'}</code>
                  </span>
                </div>

                <SingleRunChart
                  candles={state.result.candles}
                  trades={state.result.trades}
                  indicators={state.result.indicators}
                  selectedTrade={selectedTrade}
                />
              </div>

              <TradesTable
                trades={state.result.trades}
                selectedSeq={selectedTrade?.seq ?? null}
                onSelectTrade={setSelectedTrade}
              />
            </>
          )}
        </div>

        {/* Right Column: Configuration & Controls */}
        <div className="screen-side">
          <div className="panel" style={{ background: 'var(--surface)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
            <div className="panel-head">
              <h2>Dataset Setup</h2>
            </div>
            <DatasetPicker
              selectedDataset={dataset}
              onSelectDataset={setDataset}
              onOpenCreateModal={() => setIsModalOpen(true)}
            />
          </div>

          <StrategyPicker
            selectedStrategy={strategy}
            params={params}
            onSelectStrategy={handleStrategySelect}
            onChangeParams={setParams}
          />

          <button
            type="button"
            className="btn-action btn-primary"
            style={{ height: '2.4rem', fontSize: '0.9rem', justifyContent: 'center' }}
            disabled={!dataset || !strategy || state.kind === 'loading'}
            onClick={handleRun}
          >
            {state.kind === 'loading' ? 'Simulating…' : '▶ Run Backtest'}
          </button>

          {state.kind === 'ready' && (
            <MetricsPanel metrics={state.result.metrics} />
          )}
        </div>
      </div>

      {isModalOpen && (
        <DatasetFormModal
          onClose={() => setIsModalOpen(false)}
          onCreated={(created) => setDataset(created)}
        />
      )}
    </main>
  );
}
