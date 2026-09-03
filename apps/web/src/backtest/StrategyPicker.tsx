import { useEffect, useState } from 'react';
import type { CandidateSpec, StrategyMeta, StrategyParams } from '@csl/contracts';
import { STRATEGY_GROUP_LABELS } from '../search/group-labels';
import { DynamicParamForm } from './DynamicParamForm';
import { formatParams } from './param-labels';

interface StrategyPickerProps {
  selectedStrategy: StrategyMeta | null;
  customSpec?: CandidateSpec | null;
  params: StrategyParams;
  onSelectStrategy: (strategy: StrategyMeta, defaultParams: StrategyParams) => void;
  onChangeParams: (params: StrategyParams) => void;
  onClearCustomSpec?: () => void;
}

export function StrategyPicker({
  selectedStrategy,
  customSpec,
  params,
  onSelectStrategy,
  onChangeParams,
  onClearCustomSpec,
}: StrategyPickerProps) {
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch('/api/strategies')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Lỗi kết nối máy chủ (HTTP ${res.status})`);
        }
        return res.json();
      })
      .then((list: StrategyMeta[]) => {
        setStrategies(list);
        if (list.length > 0 && !selectedStrategy && !customSpec) {
          const first = list[0];
          const defaults: StrategyParams = {};
          first.params.forEach((p) => {
            defaults[p.name] = p.default;
          });
          onSelectStrategy(first, defaults);
        }
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message || 'Không thể kết nối đến máy chủ.');
        setLoading(false);
      });
  }, [onSelectStrategy, selectedStrategy, customSpec]);

  const handleStrategyChange = (strategyId: string) => {
    if (onClearCustomSpec) onClearCustomSpec();
    const found = strategies.find((s) => s.id === strategyId);
    if (found) {
      const defaults: StrategyParams = {};
      found.params.forEach((p) => {
        defaults[p.name] = p.default;
      });
      onSelectStrategy(found, defaults);
    }
  };

  return (
    <div className="panel" style={{ background: 'var(--surface)', padding: '0.85rem', borderRadius: 'var(--radius)', border: '1px solid var(--line)' }}>
      <div className="panel-head">
        <h2 title="Strategy: chiến lược giao dịch được cấu hình để chạy backtest">Cấu hình Strategy</h2>
        {customSpec ? (
          <span className="badge badge-pos">
            Tổ hợp ({customSpec.members.length} chiến lược)
          </span>
        ) : selectedStrategy ? (
          <span className="badge badge-neu">
            {STRATEGY_GROUP_LABELS[selectedStrategy.group]} · v{selectedStrategy.version}
          </span>
        ) : null}
      </div>

      {error && (
        <div style={{ marginTop: '0.4rem', fontSize: '0.78rem', color: 'var(--bad)' }}>
          ⚠ {error}
        </div>
      )}

      {customSpec ? (
        <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-tile-label">Công thức đang chọn ({customSpec.rule} · {customSpec.threshold})</span>
            {onClearCustomSpec && (
              <button
                type="button"
                className="btn-action"
                style={{ fontSize: '0.72rem', height: '1.5rem', padding: '0 0.4rem' }}
                onClick={onClearCustomSpec}
              >
                Chuyển sang đơn lẻ
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', background: 'var(--bg)', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--line)' }}>
            {customSpec.members.map((m, idx) => (
              <div key={idx} className="composite-member">
                <strong>
                  {strategies.find((s) => s.id === m.id)?.name ?? m.id}{' '}
                  <span className="source" style={{ fontWeight: 'normal' }}>v{m.version}</span>
                </strong>
                <span className="source">{(m.weight * 100).toFixed(0)}% · {formatParams(m.params)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="form-group" style={{ marginTop: '0.25rem' }}>
            <label htmlFor="strategy-select" className="stat-tile-label">
              Strategy đã chọn
            </label>
            <select
              id="strategy-select"
              className="pair-select"
              style={{ width: '100%', minWidth: 0 }}
              disabled={loading || strategies.length === 0}
              value={selectedStrategy?.id ?? ''}
              title={selectedStrategy?.name}
              onChange={(e) => handleStrategyChange(e.target.value)}
            >
              {loading ? (
                <option value="">Đang tải strategy…</option>
              ) : error ? (
                <option value="">{`Lỗi: ${error}`}</option>
              ) : strategies.length === 0 ? (
                <option value="">(Chưa có strategy nào)</option>
              ) : null}
              {strategies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {selectedStrategy && (
            <div style={{ marginTop: '0.5rem' }}>
              <h2 style={{ fontSize: '0.82rem', marginBottom: '0.4rem' }}>
                Tham số ({selectedStrategy.params.length})
              </h2>
              <DynamicParamForm
                params={selectedStrategy.params}
                values={params}
                onChange={onChangeParams}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
