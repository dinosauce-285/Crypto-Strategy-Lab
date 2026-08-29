import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '@csl/contracts';
import { formatDatasetRange } from '../market/format';

interface DatasetPickerProps {
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const selectedLabel = selectedDataset
    ? `${selectedDataset.pair} · ${selectedDataset.timeframe} (${formatDatasetRange(selectedDataset.from, selectedDataset.to)})`
    : loading
      ? 'Đang tải dataset…'
      : error
        ? `Lỗi: ${error}`
        : '(Chưa có dataset nào)';

  return (
    <div className="dataset-picker-wrap">
      <div className="dataset-picker-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
        <label className="stat-tile-label">
          Dataset đang dùng
        </label>
        <button
          type="button"
          className="btn-action"
          disabled={disabled}
          onClick={onOpenCreateModal}
          style={{ height: '1.6rem', fontSize: '0.74rem', padding: '0 0.5rem' }}
        >
          + Dataset mới
        </button>
      </div>

      <div className="custom-dropdown-wrap" ref={dropdownRef}>
        <button
          type="button"
          className="custom-dropdown-trigger"
          disabled={disabled || loading || datasets.length === 0}
          onClick={() => setIsOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selectedLabel}
          </span>
          <span style={{ fontSize: '0.65rem', marginLeft: '0.5rem', color: 'var(--muted)' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && (
          <div className="custom-dropdown-menu" role="listbox">
            {datasets.map((d) => {
              const isSelected = selectedDataset?.id === d.id;
              const feePct = Number(d.rules?.feeRate ?? 0) * 100;
              const formattedFee = Number.isFinite(feePct) ? `${Number(feePct.toFixed(4))}%` : '0%';
              const entryLabel = ENTRY_PRICE_LABELS[d.rules?.entryPrice] ?? d.rules?.entryPrice ?? '';
              const profitLabel = PROFIT_MODE_LABELS[d.rules?.profitMode] ?? d.rules?.profitMode ?? '';

              return (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="custom-dropdown-item"
                  disabled={disabled}
                  onClick={() => {
                    onSelectDataset(d);
                    setIsOpen(false);
                  }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '0.2rem',
                    padding: '0.45rem 0.6rem',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                    <span style={{ fontWeight: 600, fontSize: '0.82rem' }}>
                      {d.pair} · {d.timeframe} ({formatDatasetRange(d.from, d.to)})
                    </span>
                    {isSelected && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>}
                  </div>
                  <span className="source" style={{ fontSize: '0.72rem' }}>
                    {entryLabel} · phí {formattedFee} · {profitLabel} · warmup {d.rules?.warmupCandles ?? 0} nến
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}
