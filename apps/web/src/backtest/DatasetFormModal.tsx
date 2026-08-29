import { useEffect, useRef, useState } from 'react';
import type { Dataset, Timeframe } from '@csl/contracts';
import { PAIRS } from '../market/PairSelect';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

interface DatasetFormModalProps {
  onClose: () => void;
  onCreated: (dataset: Dataset) => void;
}

export function DatasetFormModal({ onClose, onCreated }: DatasetFormModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  
  // Default to past 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(now.toISOString().split('T')[0]);

  const [entryPrice, setEntryPrice] = useState<'next-open' | 'signal-close'>('next-open');
  const [feePercent, setFeePercent] = useState('0.1');
  const [warmupCandles, setWarmupCandles] = useState(20);
  const [profitMode, setProfitMode] = useState<'simple' | 'compound'>('compound');
  const [drawdownMode, setDrawdownMode] = useState<'trade-close' | 'per-candle'>('trade-close');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;

    // Focus first focusable element inside modal
    const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    if (focusableElements && focusableElements.length > 0) {
      focusableElements[0].focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = Array.from(
          modalRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!submitting) {
      setElapsedSeconds(0);
      return;
    }
    const interval = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [submitting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fromEpoch = new Date(fromDate).getTime();
    const toEpoch = new Date(toDate).getTime();

    if (fromEpoch >= toEpoch) {
      setError('"Từ ngày" phải sớm hơn "Đến ngày".');
      setSubmitting(false);
      return;
    }

    const parsedPercent = parseFloat(String(feePercent).replace(',', '.'));
    if (isNaN(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      setError('Phí giao dịch phải là một số hợp lệ từ 0% đến 100%.');
      setSubmitting(false);
      return;
    }
    const calculatedFeeRate = String(Number((parsedPercent / 100).toFixed(8)));

    try {
      const payload: Omit<Dataset, 'id'> = {
        pair,
        timeframe,
        from: fromEpoch,
        to: toEpoch,
        rules: {
          entryPrice,
          feeRate: calculatedFeeRate,
          warmupCandles: Number(warmupCandles),
          profitMode,
          drawdownMode,
        },
      };

      const res = await fetch('/api/datasets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Tạo dataset thất bại: Lỗi HTTP ${res.status}`);
      }

      const created: Dataset = await res.json();
      onCreated(created);
      onClose();
    } catch (err) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div
        className="modal-card"
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-modal-title"
      >
        <div className="panel-head">
          <h2 id="dataset-modal-title">Cấu hình Dataset & Quy tắc Backtest</h2>
          <button
            type="button"
            className="btn-action"
            onClick={onClose}
            aria-label="Đóng hộp thoại"
            disabled={submitting}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dataset-form">
          <div className="form-group">
            <label className="stat-tile-label">Cặp giao dịch</label>
            <select
              className="pair-select"
              value={pair}
              onChange={(e) => setPair(e.target.value)}
            >
              {PAIRS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="stat-tile-label">Khung thời gian</label>
            <select
              className="pair-select"
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            >
              {TIMEFRAMES.map((tf) => (
                <option key={tf} value={tf}>
                  {tf}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="stat-tile-label">Từ ngày</label>
              <input
                type="date"
                className="pair-select"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="stat-tile-label">Đến ngày</label>
              <input
                type="date"
                className="pair-select"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="rules-section">
            <h2 style={{ marginTop: '0.5rem', marginBottom: '0.25rem' }}>
              Quy tắc khớp lệnh khi mô phỏng
            </h2>

            <div className="form-row">
              <div className="form-group">
                <label className="stat-tile-label">Thời điểm vào lệnh</label>
                <select
                  className="pair-select"
                  value={entryPrice}
                  onChange={(e) =>
                    setEntryPrice(e.target.value as 'next-open' | 'signal-close')
                  }
                >
                  <option value="next-open">Giá mở nến kế tiếp (Thực tế)</option>
                  <option value="signal-close">Giá đóng nến tín hiệu (Lý thuyết)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="stat-tile-label">Phí giao dịch (%)</label>
                <input
                  type="number"
                  className="pair-select"
                  value={feePercent}
                  onChange={(e) => setFeePercent(e.target.value)}
                  placeholder="0.1"
                  min={0}
                  max={100}
                  step={0.001}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="stat-tile-label">Số nến khởi động (Warmup)</label>
                <input
                  type="number"
                  className="pair-select"
                  value={warmupCandles}
                  onChange={(e) => setWarmupCandles(Number(e.target.value))}
                  min={0}
                  max={500}
                  required
                />
              </div>

              <div className="form-group">
                <label className="stat-tile-label">Cách tính lợi nhuận</label>
                <select
                  className="pair-select"
                  value={profitMode}
                  onChange={(e) =>
                    setProfitMode(e.target.value as 'simple' | 'compound')
                  }
                >
                  <option value="compound">Lãi kép (Geometric)</option>
                  <option value="simple">Cộng dồn đơn giản (Linear Sum)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="stat-tile-label">Cách tính Drawdown</label>
              <select
                className="pair-select"
                value={drawdownMode}
                onChange={(e) =>
                  setDrawdownMode(e.target.value as 'trade-close' | 'per-candle')
                }
              >
                <option value="trade-close">Khi đóng lệnh (Closed Equity)</option>
                <option value="per-candle">Theo từng nến (Intra-trade Wicks)</option>
              </select>
            </div>
          </div>

          {submitting && (
            <p className="state">
              Đang tải nến từ Binance — với khoảng ngày dài có thể mất 10-20 giây.
            </p>
          )}

          {error && <p className="state bad">{error}</p>}

          <div className="controls-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="submit"
              className="btn-action btn-primary"
              disabled={submitting}
            >
              {submitting ? `Đang tạo… (${elapsedSeconds}s)` : 'Tạo & Chọn Dataset'}
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={onClose}
              disabled={submitting}
            >
              Hủy
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
