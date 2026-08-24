import type { Dataset, RunEndReason, RunStatus, StrategyMeta, StrategyRef } from '@csl/contracts';

const END_REASON_LABELS: Record<RunEndReason, string> = {
  candidates: 'Reached the max candidates limit',
  duration: 'Reached the time limit',
  plateau: 'No improvement for a while',
  exhausted: 'No more candidates left to generate',
  stopped: 'Stopped manually',
};

interface SearchProgressPanelProps {
  status: RunStatus | null;
  dataset: Dataset | null;
  strategies: StrategyMeta[];
  requestError: string | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  busy: boolean;
}

export function SearchProgressPanel({
  status,
  dataset,
  strategies,
  requestError,
  onPause,
  onResume,
  onStop,
  busy,
}: SearchProgressPanelProps) {
  if (!status) {
    return (
      <div className="panel search-progress-panel empty-progress">
        <p className="state">No search run is active for the selected dataset.</p>
        {requestError && <p className="state bad">{requestError}</p>}
      </div>
    );
  }

  const runningDataset = dataset?.id === status.datasetId ? dataset : null;
  const selectedNames = status.strategyRefs
    .map((ref) => strategyLabel(ref, strategies))
    .join(' + ');
  const tested = status.counters.tried;
  const budget = status.bound.maxCandidates;
  const progress = budget ? Math.min(100, (tested / budget) * 100) : 0;

  return (
    <div className="panel search-progress-panel">
      <div className="panel-head">
        <h2>Run Progress</h2>
        <span className={`badge ${status.state === 'running' ? 'badge-pos' : 'badge-neu'}`}>
          {status.state}
        </span>
      </div>

      <div className="running-dataset">
        <span className="stat-tile-label">Running dataset</span>
        <strong>{runningDataset ? datasetLabel(runningDataset) : status.datasetId}</strong>
      </div>

      <div className="progress-meter" aria-label="Search progress">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="stat-tiles">
        <Stat label="Candidates tested" value={tested.toString()} />
        <Stat label="Queued" value={status.counters.queued.toString()} />
        <Stat label="Failed" value={status.counters.failed.toString()} />
        <Stat
          label="Avg backtest"
          value={
            status.counters.averageBacktestMs
              ? `${status.counters.averageBacktestMs}ms`
              : '-'
          }
        />
      </div>

      <div className="search-recipe">
        <span className="stat-tile-label">Selected strategies</span>
        <strong>{selectedNames || 'No strategies recorded'}</strong>
      </div>

      {status.counters.best && (
        <div className="search-recipe">
          <span className="stat-tile-label">Current best</span>
          <strong>
            {formatPercent(status.counters.best.totalReturn)} return /{' '}
            {status.counters.best.specHash.slice(0, 8)}
          </strong>
        </div>
      )}

      {status.endReason && <p className="state">Ended because: {END_REASON_LABELS[status.endReason]}</p>}
      {requestError && <p className="state bad">{requestError}</p>}

      <div className="controls-row">
        {status.state === 'running' && (
          <button type="button" className="btn-action" disabled={busy} onClick={onPause}>
            Pause
          </button>
        )}
        {status.state === 'paused' && (
          <button type="button" className="btn-action" disabled={busy} onClick={onResume}>
            Resume
          </button>
        )}
        {status.state !== 'ended' && (
          <button type="button" className="btn-action" disabled={busy} onClick={onStop}>
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-tile">
      <span className="stat-tile-label">{label}</span>
      <span className="stat-tile-val">{value}</span>
    </div>
  );
}

function datasetLabel(dataset: Dataset): string {
  return `${dataset.pair} / ${dataset.timeframe} / ${new Date(
    dataset.from,
  ).toLocaleDateString()} - ${new Date(dataset.to).toLocaleDateString()}`;
}

function strategyLabel(ref: StrategyRef, strategies: StrategyMeta[]): string {
  const strategy = strategies.find(
    (candidate) => candidate.id === ref.id && candidate.version === ref.version,
  );
  return strategy ? `${strategy.name} v${strategy.version}` : `${ref.id}@${ref.version}`;
}

function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${(value * 100).toFixed(2)}%`;
}
