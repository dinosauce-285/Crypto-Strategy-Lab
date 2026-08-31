import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '@csl/contracts';

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
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    ? `${selectedDataset.pair} · ${selectedDataset.timeframe} (${new Date(selectedDataset.from).toLocaleDateString()} - ${new Date(selectedDataset.to).toLocaleDateString()})`
    : loading
      ? 'Đang tải dataset…'
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
          title={selectedLabel}
        >
          <span>{selectedLabel}</span>
          <span style={{ fontSize: '0.65rem', marginLeft: '0.5rem', color: 'var(--muted)' }}>
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {isOpen && (
          <div className="custom-dropdown-menu" role="listbox">
            {datasets.map((d) => {
              const isSelected = selectedDataset?.id === d.id;
              const label = `${d.pair} · ${d.timeframe} (${new Date(d.from).toLocaleDateString()} - ${new Date(d.to).toLocaleDateString()})`;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  className="custom-dropdown-item"
                  disabled={disabled}
                  title={label}
                  onClick={() => {
                    onSelectDataset(d);
                    setIsOpen(false);
                  }}
                >
                  <span>{label}</span>
                  {isSelected && <span style={{ color: 'var(--accent)', fontSize: '0.75rem' }}>✓</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedDataset && (
        <div className="source" style={{ marginTop: '0.4rem', lineHeight: '1.35' }}>
          <strong>Quy tắc:</strong> {selectedDataset.rules.entryPrice} · phí {Number(selectedDataset.rules.feeRate) * 100}% · warmup {selectedDataset.rules.warmupCandles} · {selectedDataset.rules.profitMode} · {selectedDataset.rules.drawdownMode}
        </div>
      )}
    </div>
  );
}
