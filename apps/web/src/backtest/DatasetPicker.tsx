import { useEffect, useState } from 'react';
import type { Dataset } from '@csl/contracts';
import { formatDatasetRange } from '../market/format';
import { DatasetManagementModal } from './DatasetManagementModal';

interface DatasetPickerProps {
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset | null) => void;
  onOpenCreateModal: () => void;
  disabled?: boolean;
}

const ENTRY_PRICE_LABELS: Record<'next-open' | 'signal-close', string> = {
  'next-open': 'Mở nến kế tiếp',
  'signal-close': 'Đóng nến tín hiệu',
};

const PROFIT_MODE_LABELS: Record<'simple' | 'compound', string> = {
  compound: 'Lãi kép',
  simple: 'Cộng dồn đơn giản',
};

const DRAWDOWN_MODE_LABELS: Record<'trade-close' | 'per-candle', string> = {
  'trade-close': 'Drawdown khi đóng lệnh',
  'per-candle': 'Drawdown theo từng nến',
};

export function DatasetPicker({
  selectedDataset,
  onSelectDataset,
  onOpenCreateModal,
  disabled = false,
}: DatasetPickerProps) {
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManagementOpen, setIsManagementOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/datasets')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Lỗi kết nối máy chủ (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((data: Dataset[]) => {
        setDatasets(data);
        if (data.length > 0 && !selectedDataset) {
          onSelectDataset(data[0]);
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Không thể kết nối đến máy chủ.');
        setLoading(false);
      });
  }, [onSelectDataset, selectedDataset]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    const found = datasets.find((d) => d.id === selectedId);
    if (found) {
      onSelectDataset(found);
    }
  };

  const handleDeleted = (deleted: Dataset) => {
    const remaining = datasets.filter((dataset) => dataset.id !== deleted.id);
    setDatasets(remaining);
    if (selectedDataset?.id === deleted.id) onSelectDataset(remaining[0] ?? null);
  };

  // The column is narrower than the label, so the full text lives on the control's title.
  const selectedLabel = selectedDataset
    ? `${selectedDataset.pair} · ${selectedDataset.timeframe} (${formatDatasetRange(selectedDataset.from, selectedDataset.to)})`
    : undefined;

  return (
    <div className="dataset-picker-wrap">
      <div
        className="dataset-picker-header"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.35rem',
        }}
      >
        <label className="stat-tile-label" htmlFor="dataset-select">
          Dataset đang dùng
        </label>
        <div className="dataset-picker-actions">
          <button
            type="button"
            className="btn-action"
            disabled={disabled}
            onClick={onOpenCreateModal}
            style={{ height: '1.6rem', fontSize: '0.74rem', padding: '0 0.5rem' }}
          >
            + Dataset mới
          </button>
          <button
            type="button"
            className="btn-action"
            disabled={disabled || loading}
            onClick={() => setIsManagementOpen(true)}
            style={{ height: '1.6rem', fontSize: '0.74rem', padding: '0 0.5rem' }}
          >
            Quản lý
          </button>
        </div>
      </div>

      <select
        id="dataset-select"
        className="pair-select"
        value={selectedDataset?.id ?? ''}
        onChange={handleChange}
        disabled={disabled || loading || datasets.length === 0}
        aria-label="Chọn dataset"
        title={selectedLabel}
        style={{ width: '100%' }}
      >
        {datasets.length === 0 && (
          <option value="" disabled>
            {loading ? 'Đang tải dataset…' : error ? `Lỗi: ${error}` : '(Chưa có dataset nào)'}
          </option>
        )}
        {datasets.map((d) => {
          const feePct = Number(d.rules?.feeRate ?? 0) * 100;
          const formattedFee = Number.isFinite(feePct) ? `${Number(feePct.toFixed(4))}%` : '0%';
          const entryLabel = ENTRY_PRICE_LABELS[d.rules?.entryPrice] ?? d.rules?.entryPrice ?? '';
          const profitLabel = PROFIT_MODE_LABELS[d.rules?.profitMode] ?? d.rules?.profitMode ?? '';

          return (
            <option key={d.id} value={d.id}>
              {d.pair} · {d.timeframe} ({formatDatasetRange(d.from, d.to)}) — {entryLabel} · phí {formattedFee} · {profitLabel}
            </option>
          );
        })}
      </select>

      {error && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--bad)' }}>
          ⚠ {error}
        </div>
      )}

      {selectedDataset && (() => {
        const feePct = Number(selectedDataset.rules.feeRate) * 100;
        const formattedFee = Number.isFinite(feePct) ? `${Number(feePct.toFixed(4))}%` : '0%';
        const entryLabel = ENTRY_PRICE_LABELS[selectedDataset.rules.entryPrice] ?? selectedDataset.rules.entryPrice;
        const profitLabel = PROFIT_MODE_LABELS[selectedDataset.rules.profitMode] ?? selectedDataset.rules.profitMode;
        const ddLabel = DRAWDOWN_MODE_LABELS[selectedDataset.rules.drawdownMode] ?? selectedDataset.rules.drawdownMode;

        return (
          <div className="source" style={{ marginTop: '0.4rem', lineHeight: '1.35' }}>
            <strong>Quy tắc:</strong> {entryLabel} · phí {formattedFee} · warmup {selectedDataset.rules.warmupCandles} nến · {profitLabel} · {ddLabel}
          </div>
        );
      })()}

      {isManagementOpen && (
        <DatasetManagementModal
          datasets={datasets}
          loading={loading}
          listError={error}
          onClose={() => setIsManagementOpen(false)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
}
