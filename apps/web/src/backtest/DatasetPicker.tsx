import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '@csl/contracts';
import { date } from '../market/format';

interface DatasetPickerProps {
  selectedDataset: Dataset | null;
  onSelectDataset: (dataset: Dataset) => void;
  onOpenCreateModal: () => void;
  disabled?: boolean;
}

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
    ? `${selectedDataset.pair} · ${selectedDataset.timeframe} (${date(selectedDataset.from)} - ${date(selectedDataset.to)})`
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
                >
                  <span>
                    {d.pair} · {d.timeframe} ({date(d.from)} - {date(d.to)})
                  </span>
                  {isSelected && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>}
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
        return (
          <div className="source" style={{ marginTop: '0.4rem', lineHeight: '1.35' }}>
            <strong>Quy tắc:</strong> {selectedDataset.rules.entryPrice} · phí {formattedFee} · warmup {selectedDataset.rules.warmupCandles} · {selectedDataset.rules.profitMode} · {selectedDataset.rules.drawdownMode}
          </div>
        );
      })()}
    </div>
  );
}
