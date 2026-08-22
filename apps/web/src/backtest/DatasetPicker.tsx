import { useEffect, useState } from 'react';
import type { Dataset } from '@csl/contracts';

interface DatasetPickerProps {
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onOpenCreateModal: () => void;
}

export function DatasetPicker({
  selectedDataset,
  onSelectDataset,
  onOpenCreateModal,
}: DatasetPickerProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/datasets')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Dataset[]) => {
        setDatasets(data);
        if (data.length > 0 && !selectedDataset) {
          onSelectDataset(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [onSelectDataset, selectedDataset]);

  return (
    <div className="dataset-picker-wrap">
      <div className="dataset-picker-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <label htmlFor="dataset-select" className="stat-tile-label">
          Active Dataset
        </label>
        <button
          type="button"
          className="btn-action"
          onClick={onOpenCreateModal}
          style={{ height: '1.6rem', fontSize: '0.74rem', padding: '0 0.5rem' }}
        >
          + New Dataset
        </button>
      </div>

      <select
        id="dataset-select"
        className="pair-select"
        style={{ width: '100%', minWidth: 0 }}
        disabled={loading || datasets.length === 0}
        value={selectedDataset?.id ?? ''}
        onChange={(e) => {
          const found = datasets.find((d) => d.id === e.target.value);
          if (found) onSelectDataset(found);
        }}
      >
        {datasets.length === 0 ? (
          <option value="">(No datasets defined)</option>
        ) : (
          datasets.map((d) => (
            <option key={d.id} value={d.id}>
              {d.pair} · {d.timeframe} ({new Date(d.from).toLocaleDateString()} - {new Date(d.to).toLocaleDateString()}) · {d.rules.profitMode}
            </option>
          ))
        )}
      </select>

      {selectedDataset && (
        <div className="source" style={{ marginTop: '0.4rem', lineHeight: '1.35' }}>
          <strong>Rules:</strong> {selectedDataset.rules.entryPrice} · fee {Number(selectedDataset.rules.feeRate) * 100}% · warmup {selectedDataset.rules.warmupCandles} · {selectedDataset.rules.profitMode} · {selectedDataset.rules.drawdownMode}
        </div>
      )}
    </div>
  );
}
