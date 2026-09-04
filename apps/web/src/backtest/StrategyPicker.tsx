import { useEffect, useState } from 'react';
import type { CandidateSpec, StrategyMeta, StrategyParams } from '@csl/contracts';
import { apiFetch } from '../api/request';
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
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<StrategyMeta[]>('/api/strategies')
      .then((list) => {
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
  }, [onSelectStrategy, selectedStrategy, customSpec, attempt]);

  const handleStrategyChange = (strategyId: string) => {
    if (onClearCustomSpec) onClearCustomSpec();
    const found = strategies.find((s) => s.id === strategyId);
    if (!found) return;
    const defaults: StrategyParams = {};
    found.params.forEach((p) => {
      defaults[p.name] = p.default;
    });
    onSelectStrategy(found, defaults);
  };

  return (
    <div className="panel panel-box">
      <div className="panel-head">
        <h2 title="Strategy: chiến lược giao dịch được cấu hình để chạy backtest">
          Cấu hình Strategy
        </h2>
        {customSpec ? (
          <span className="badge badge-key">Tổ hợp ({customSpec.members.length} chiến lược)</span>
        ) : selectedStrategy ? (
          <span className="badge badge-neu">
            {STRATEGY_GROUP_LABELS[selectedStrategy.group]} · v{selectedStrategy.version}
          </span>
        ) : null}
      </div>

      {error && (
        <div className="field-retry">
          <p className="field-error">{error}</p>
          <button
            type="button"
            className="btn-action btn-sm"
            disabled={loading}
            onClick={() => setAttempt((n) => n + 1)}
          >
            Thử lại
          </button>
        </div>
      )}

      {customSpec ? (
        <>
          <div className="controls-row">
            <span className="stat-tile-label">
              Công thức đang chọn ({customSpec.rule} · {customSpec.threshold})
            </span>
            {onClearCustomSpec && (
              <button type="button" className="btn-action btn-sm" onClick={onClearCustomSpec}>
                Chuyển sang đơn lẻ
              </button>
            )}
          </div>
          <div className="spec-readout">
            {/* Index key: the specification is read-only here, never reordered or filtered. */}
            {customSpec.members.map((m, idx) => (
              <div key={idx} className="composite-member">
                <strong>
                  {strategies.find((s) => s.id === m.id)?.name ?? m.id}{' '}
                  <span className="source">v{m.version}</span>
                </strong>
                <span className="source">
                  {(m.weight * 100).toFixed(0)}% · {formatParams(m.params)}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <label className="form-group" htmlFor="strategy-select">
            <span className="stat-tile-label">Strategy đã chọn</span>
            <select
              id="strategy-select"
              className="pair-select"
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
          </label>

          {selectedStrategy && (
            <div className="panel">
              <span className="stat-tile-label">Tham số ({selectedStrategy.params.length})</span>
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
