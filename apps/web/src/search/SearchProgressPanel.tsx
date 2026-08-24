import type {
  Dataset,
  RunEndReason,
  RunState,
  RunStatus,
  StrategyMeta,
  StrategyRef,
} from '@csl/contracts';

const END_REASON_LABELS: Record<RunEndReason, string> = {
  candidates: 'Đã đạt số lượng candidate tối đa',
  duration: 'Đã hết thời gian giới hạn',
  plateau: 'Không cải thiện thêm trong một khoảng thời gian',
  exhausted: 'Không còn candidate nào để tạo thêm',
  stopped: 'Đã dừng thủ công',
};

const RUN_STATE_LABELS: Record<RunState, string> = {
  running: 'Đang chạy',
  paused: 'Đã tạm dừng',
  ended: 'Đã kết thúc',
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
        <p className="state">Không có lượt search nào đang chạy cho dataset đã chọn.</p>
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
        <h2>Tiến trình chạy</h2>
        <span className={`badge ${status.state === 'running' ? 'badge-pos' : 'badge-neu'}`}>
          {RUN_STATE_LABELS[status.state]}
        </span>
      </div>

      <div className="running-dataset">
        <span className="stat-tile-label">Dataset đang chạy</span>
        <strong>{runningDataset ? datasetLabel(runningDataset) : status.datasetId}</strong>
      </div>

      <div className="progress-meter" aria-label="Tiến trình search">
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="stat-tiles">
        <Stat label="Đã thử" value={tested.toString()} />
        <Stat label="Đang chờ" value={status.counters.queued.toString()} />
        <Stat label="Thất bại" value={status.counters.failed.toString()} />
        <Stat
          label="Backtest trung bình"
          value={
            status.counters.averageBacktestMs
              ? `${status.counters.averageBacktestMs}ms`
              : '-'
          }
        />
      </div>

      <div className="search-recipe">
        <span className="stat-tile-label">Strategy đã chọn</span>
        <strong>{selectedNames || 'Không ghi nhận strategy nào'}</strong>
      </div>

      {status.counters.best && (
        <div className="search-recipe">
          <span className="stat-tile-label">Kết quả tốt nhất hiện tại</span>
          <strong>
            Lợi nhuận {formatPercent(status.counters.best.totalReturn)} /{' '}
            {status.counters.best.specHash.slice(0, 8)}
          </strong>
        </div>
      )}

      {status.endReason && <p className="state">Kết thúc vì: {END_REASON_LABELS[status.endReason]}</p>}
      {requestError && <p className="state bad">{requestError}</p>}

      <div className="controls-row">
        {status.state === 'running' && (
          <button type="button" className="btn-action" disabled={busy} onClick={onPause}>
            Tạm dừng
          </button>
        )}
        {status.state === 'paused' && (
          <button type="button" className="btn-action" disabled={busy} onClick={onResume}>
            Tiếp tục
          </button>
        )}
        {status.state !== 'ended' && (
          <button type="button" className="btn-action" disabled={busy} onClick={onStop}>
            Dừng
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
