import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  canonicalJson,
  type CandidateSpec,
  type Dataset,
  type StrategyMeta,
  type StrategyParams,
  type Timeframe,
} from '@csl/contracts';
import { apiFetch } from '../api/request';
import { Header } from '../layout/Header';
import { DatasetPicker } from '../backtest/DatasetPicker';
import { DatasetFormModal } from '../backtest/DatasetFormModal';
import { StrategyPicker } from '../backtest/StrategyPicker';
import { SingleRunChart } from '../backtest/SingleRunChart';
import { MetricsPanel } from '../backtest/MetricsPanel';
import { LeaderboardLink } from '../leaderboard/LeaderboardLink';
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
  const location = useLocation();
  // Read on the first render, not in an effect: StrategyPicker falls back to the first
  // single strategy as soon as its list arrives, and an arriving specification has to be
  // in hand before that happens or the panel describes a strategy the run never used.
  const arrivingSpec = (location.state as { spec?: CandidateSpec } | null)?.spec ?? null;
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [strategy, setStrategy] = useState<StrategyMeta | null>(null);
  const [customSpec, setCustomSpec] = useState<CandidateSpec | null>(arrivingSpec);
  const [params, setParams] = useState<StrategyParams>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [state, setState] = useState<RunState>({ kind: 'idle' });
  const [selectedTrade, setSelectedTrade] = useState<TradeRow | null>(null);

  const runSimulation = useCallback(async (targetDatasetId: string, targetSpec: CandidateSpec) => {
    setState({ kind: 'loading' });
    setSelectedTrade(null);

    try {
      const body = await apiFetch<SingleRunResult>('/api/backtest/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          datasetId: targetDatasetId,
          spec: targetSpec,
        }),
      });
      setState({ kind: 'ready', result: body });
    } catch (err) {
      setState({ kind: 'error', message: (err as Error).message });
    }
  }, []);

  // Preload and auto-run if navigated from Leaderboard with state
  useEffect(() => {
    const navState = location.state as { datasetId?: string; spec?: CandidateSpec } | null;
    if (!navState?.datasetId) return;

    if (navState.spec) {
      setCustomSpec(navState.spec);
    }

    fetch('/api/datasets')
      .then((res) => (res.ok ? res.json() : []))
      .then((datasets: Dataset[]) => {
        const match = datasets.find((d) => d.id === navState.datasetId);
        if (match) {
          setDataset(match);
          if (navState.spec) {
            void runSimulation(match.id, navState.spec);
          }
        }
      })
      .catch(() => {});
  }, [location.state, runSimulation]);

  const handleStrategySelect = (meta: StrategyMeta, defaultParams: StrategyParams) => {
    setCustomSpec(null);
    setStrategy(meta);
    setParams(defaultParams);
  };

  const handleClearCustomSpec = () => {
    setCustomSpec(null);
  };

  const handleRun = async () => {
    if (!dataset) return;

    if (customSpec) {
      void runSimulation(dataset.id, customSpec);
      return;
    }

    if (!strategy) return;

    // Validate parameters against defined min/max bounds before running
    for (const spec of strategy.params) {
      const val = params[spec.name] ?? spec.default;
      if (typeof val !== 'number' || Number.isNaN(val) || val < spec.min || val > spec.max) {
        setState({
          kind: 'error',
          message: `Tham số "${spec.name}" phải là số hợp lệ trong khoảng [${spec.min} .. ${spec.max}].`,
        });
        return;
      }
    }

    const payloadSpec: CandidateSpec = {
      rule: 'weighted',
      threshold: 0.5,
      members: [
        {
          id: strategy.id,
          version: strategy.version,
          params,
          paramsHash: canonicalJson(params),
          weight: 1.0,
        },
      ],
    };

    void runSimulation(dataset.id, payloadSpec);
  };

  return (
    <main className="screen">
      <Header title="Chạy Backtest" />

      <div className="screen-body">
        {/* Left Column: Visual Chart & Analysis Panels */}
        <div className="screen-main">
          {state.kind === 'idle' && (
            <div
              className="panel grows backtest-stage"
              style={{
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
                Chọn dataset và strategy ở bên phải, sau đó nhấn <strong>▶ Chạy Backtest</strong> để mô phỏng việc thực thi lệnh, vẽ biểu đồ nến kèm indicator, và xem các chỉ số hiệu suất giao dịch.
              </p>
            </div>
          )}

          {state.kind === 'loading' && (
            <div
              className="panel grows backtest-stage"
              style={{
                border: '1px solid var(--line)',
                borderRadius: 'var(--radius)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem',
                textAlign: 'center',
              }}
            >
              <p className="state">Đang mô phỏng backtest & tính toán chỉ số…</p>
            </div>
          )}

          {state.kind === 'error' && (
            <div
              className="panel grows backtest-stage"
              style={{
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
                <strong>Mô phỏng thất bại.</strong> {state.message}
              </p>
              <button type="button" className="btn-action" onClick={handleRun}>
                Thử lại
              </button>
            </div>
          )}

          {state.kind === 'ready' && (
            <>
              <div className="panel grows backtest-stage">
                <div className="panel-head">
                  <h2>
                    {state.result.dataset.pair} · {state.result.dataset.timeframe} (
                    {state.result.candles.length} nến)
                  </h2>
                  <span className="source badge badge-neu">
                    Mô phỏng hoàn tất
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
              <h2 title="Dataset: tập dữ liệu nến lịch sử đã tải, dùng để chạy backtest">Thiết lập Dataset</h2>
            </div>
            <DatasetPicker
              selectedDataset={dataset}
              onSelectDataset={setDataset}
              onOpenCreateModal={() => setIsModalOpen(true)}
            />
          </div>

          <StrategyPicker
            selectedStrategy={strategy}
            customSpec={customSpec}
            params={params}
            onSelectStrategy={handleStrategySelect}
            onChangeParams={setParams}
            onClearCustomSpec={handleClearCustomSpec}
          />

          <button
            type="button"
            className="btn-action btn-primary"
            style={{ height: '2.4rem', fontSize: '0.9rem', justifyContent: 'center' }}
            disabled={!dataset || (!strategy && !customSpec) || state.kind === 'loading'}
            onClick={handleRun}
          >
            {state.kind === 'loading' ? 'Đang mô phỏng…' : '▶ Chạy Backtest'}
          </button>

          {state.kind === 'ready' && <MetricsPanel metrics={state.result.metrics} />}

          <LeaderboardLink hint="Xếp hạng các tổ hợp đã chấm điểm trên cùng dataset." />
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
