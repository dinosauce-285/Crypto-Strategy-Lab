import { useEffect, useState } from 'react';
import type { StrategyMeta, StrategyParams } from '@csl/contracts';
import { STRATEGY_GROUP_LABELS } from '../search/group-labels';
import { DynamicParamForm } from './DynamicParamForm';

interface StrategyPickerProps {
  selectedStrategy: StrategyMeta | null;
  params: StrategyParams;
  onSelectStrategy: (strategy: StrategyMeta, defaultParams: StrategyParams) => void;
  onChangeParams: (params: StrategyParams) => void;
}

export function StrategyPicker({
  selectedStrategy,
  params,
  onSelectStrategy,
  onChangeParams,
}: StrategyPickerProps) {
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/strategies')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: StrategyMeta[]) => {
        setStrategies(list);
        if (list.length > 0 && !selectedStrategy) {
          const first = list[0];
          const defaults: StrategyParams = {};
          first.params.forEach((p) => {
            defaults[p.name] = p.default;
          });
          onSelectStrategy(first, defaults);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [onSelectStrategy, selectedStrategy]);

  const handleStrategyChange = (strategyId: string) => {
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
        <h2>Cấu hình Strategy</h2>
        {selectedStrategy && (
          <span className="badge badge-neu">
            {STRATEGY_GROUP_LABELS[selectedStrategy.group]} · v{selectedStrategy.version}
          </span>
        )}
      </div>

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
          onChange={(e) => handleStrategyChange(e.target.value)}
        >
          {strategies.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.id})
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
    </div>
  );
}
