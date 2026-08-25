import { SEARCH_MODES, type Dataset, type SearchMode } from '@csl/contracts';
import { DatasetPicker } from '../backtest/DatasetPicker';

const SEARCH_MODE_LABELS: Partial<Record<SearchMode, string>> = {
  'domain-guided': 'Có định hướng (Domain guided)',
  random: 'Ngẫu nhiên',
};

const modeLabel = (mode: SearchMode): string =>
  SEARCH_MODE_LABELS[mode] ??
  mode
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

interface SearchControlsPanelProps {
  dataset: Dataset | null;
  mode: SearchMode;
  maxCandidates: number;
  busy: boolean;
  isRunning: boolean;
  canStart: boolean;
  blockedReason: string | null;
  onDatasetChange: (dataset: Dataset) => void;
  onOpenDatasetModal: () => void;
  onModeChange: (mode: SearchMode) => void;
  onMaxCandidatesChange: (value: number) => void;
  onStart: () => void;
}

export function SearchControlsPanel({
  dataset,
  mode,
  maxCandidates,
  busy,
  isRunning,
  canStart,
  blockedReason,
  onDatasetChange,
  onOpenDatasetModal,
  onModeChange,
  onMaxCandidatesChange,
  onStart,
}: SearchControlsPanelProps) {
  const disabled = busy || isRunning;
  const candidateLimitInvalid =
    !Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 10000;

  return (
    <div className="screen-side">
      <div className="panel search-control-panel">
        <div className="panel-head">
          <h2>Dataset</h2>
        </div>
        <DatasetPicker
          selectedDataset={dataset}
          onSelectDataset={onDatasetChange}
          onOpenCreateModal={onOpenDatasetModal}
          disabled={disabled}
        />
      </div>

      <div className="panel search-control-panel">
        <div className="panel-head">
          <h2>Giới hạn lượt chạy</h2>
        </div>

        <label className="form-group">
          <span className="stat-tile-label">Chế độ</span>
          <select
            className="pair-select"
            value={mode}
            disabled={disabled}
            onChange={(event) => onModeChange(event.target.value as SearchMode)}
          >
            {SEARCH_MODES.map((item) => (
              <option key={item} value={item}>
                {modeLabel(item)}
              </option>
            ))}
          </select>
        </label>

        <label className="form-group">
          <span className="stat-tile-label">Số candidate tối đa</span>
          <input
            type="number"
            className="pair-select"
            min={1}
            max={10000}
            step={1}
            required
            value={maxCandidates}
            aria-invalid={candidateLimitInvalid}
            disabled={disabled}
            onChange={(event) =>
              onMaxCandidatesChange(
                Number.isFinite(event.target.valueAsNumber) ? event.target.valueAsNumber : 0,
              )
            }
          />
        </label>

        {blockedReason && <p className="state bad">{blockedReason}</p>}

        <button
          type="button"
          className="btn-action btn-primary start-search-btn"
          disabled={!canStart || busy || isRunning}
          onClick={onStart}
        >
          {busy ? 'Đang bắt đầu...' : 'BẮT ĐẦU SEARCH'}
        </button>
      </div>
    </div>
  );
}
