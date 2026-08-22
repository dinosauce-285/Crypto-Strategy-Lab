import { useState } from 'react';
import type { Dataset, Timeframe } from '@csl/contracts';
import { PAIRS } from '../market/PairSelect';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d'];

interface DatasetFormModalProps {
  onClose: () => void;
  onCreated: (dataset: Dataset) => void;
}

export function DatasetFormModal({ onClose, onCreated }: DatasetFormModalProps) {
  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  
  // Default to past 30 days
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [toDate, setToDate] = useState(now.toISOString().split('T')[0]);

  const [entryPrice, setEntryPrice] = useState<'next-open' | 'signal-close'>('next-open');
  const [feeRate, setFeeRate] = useState('0.001');
  const [warmupCandles, setWarmupCandles] = useState(20);
  const [profitMode, setProfitMode] = useState<'simple' | 'compound'>('compound');
  const [drawdownMode, setDrawdownMode] = useState<'trade-close' | 'per-candle'>('trade-close');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const fromEpoch = new Date(fromDate).getTime();
    const toEpoch = new Date(toDate).getTime();

    if (fromEpoch >= toEpoch) {
      setError('"From" date must be earlier than "To" date.');
      setSubmitting(false);
      return;
    }

    try {
      const payload: Omit<Dataset, 'id'> = {
        pair,
        timeframe,
        from: fromEpoch,
        to: toEpoch,
        rules: {
          entryPrice,
          feeRate,
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
        throw new Error(`Failed to create dataset: HTTP ${res.status}`);
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
    <div className="modal-backdrop">
      <div className="modal-card">
        <div className="panel-head">
          <h2>Define Dataset & Backtest Rules</h2>
          <button type="button" className="btn-action" onClick={onClose}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="dataset-form">
          <div className="form-group">
            <label className="stat-tile-label">Pair</label>
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
            <label className="stat-tile-label">Timeframe</label>
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
              <label className="stat-tile-label">From Date</label>
              <input
                type="date"
                className="pair-select"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="stat-tile-label">To Date</label>
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
              Execution Rules (ADR 0010)
            </h2>

            <div className="form-row">
              <div className="form-group">
                <label className="stat-tile-label">Entry Price Timing</label>
                <select
                  className="pair-select"
                  value={entryPrice}
                  onChange={(e) =>
                    setEntryPrice(e.target.value as 'next-open' | 'signal-close')
                  }
                >
                  <option value="next-open">Next Open (Realistic)</option>
                  <option value="signal-close">Signal Close (Theoretical)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="stat-tile-label">Fee Rate (Fraction)</label>
                <input
                  type="text"
                  className="pair-select"
                  value={feeRate}
                  onChange={(e) => setFeeRate(e.target.value)}
                  placeholder="0.001 (0.1%)"
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="stat-tile-label">Warmup Candles</label>
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
                <label className="stat-tile-label">Profit Mode</label>
                <select
                  className="pair-select"
                  value={profitMode}
                  onChange={(e) =>
                    setProfitMode(e.target.value as 'simple' | 'compound')
                  }
                >
                  <option value="compound">Compound (Geometric)</option>
                  <option value="simple">Simple (Linear Sum)</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="stat-tile-label">Drawdown Mode</label>
              <select
                className="pair-select"
                value={drawdownMode}
                onChange={(e) =>
                  setDrawdownMode(e.target.value as 'trade-close' | 'per-candle')
                }
              >
                <option value="trade-close">Trade Close (Closed Equity)</option>
                <option value="per-candle">Per Candle (Intra-trade Wicks)</option>
              </select>
            </div>
          </div>

          {error && <p className="state bad">{error}</p>}

          <div className="controls-row" style={{ marginTop: '0.75rem' }}>
            <button
              type="submit"
              className="btn-action btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Creating…' : 'Create & Select Dataset'}
            </button>
            <button
              type="button"
              className="btn-action"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
