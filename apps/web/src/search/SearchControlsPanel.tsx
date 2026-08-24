import type { Dataset, SearchMode } from '@csl/contracts';
import { DatasetPicker } from '../backtest/DatasetPicker';

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
          <h2>Run Bound</h2>
        </div>

        <label className="form-group">
          <span className="stat-tile-label">Mode</span>
          <select
            className="pair-select"
            value={mode}
            disabled={disabled}
            onChange={(event) => onModeChange(event.target.value as SearchMode)}
          >
            <option value="domain-guided">Domain guided</option>
            <option value="random">Random</option>
          </select>
        </label>

        <label className="form-group">
          <span className="stat-tile-label">Max candidates</span>
          <input
            type="number"
            className="pair-select"
            min={1}
            max={10000}
            value={maxCandidates}
            disabled={disabled}
            onChange={(event) => onMaxCandidatesChange(Number(event.target.value))}
          />
        </label>

        {blockedReason && <p className="state bad">{blockedReason}</p>}

        <button
          type="button"
          className="btn-action btn-primary start-search-btn"
          disabled={!canStart || busy || isRunning}
          onClick={onStart}
        >
          {busy ? 'Starting...' : 'START SEARCH'}
        </button>
      </div>
    </div>
  );
}
