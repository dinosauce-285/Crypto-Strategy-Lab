import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_THRESHOLD,
  MAX_MEMBERS,
  WEIGHT_STEP,
  type Dataset,
  type StrategyMeta,
  type StrategyParams,
} from '@csl/contracts';
import { STRATEGY_GROUP_LABELS } from './group-labels';
import {
  balancedParts,
  buildSpec,
  defaultParams,
  strategyKey,
  totalParts,
  weightOf,
  TOTAL_PARTS,
  type Parts,
} from './composite-spec';
import { DynamicParamForm } from '../backtest/DynamicParamForm';

interface ManualCompositePanelProps {
  strategies: StrategyMeta[];
  dataset: Dataset | null;
}

const THRESHOLDS = Array.from({ length: TOTAL_PARTS - 1 }, (_, index) =>
  Number(((index + 1) * WEIGHT_STEP).toFixed(1)),
);

const percent = (weight: number): string => `${Math.round(weight * 100)}%`;

/**
 * Members are listed in the order the registry returns, not the order they were ticked,
 * so the same set of strategies always produces the same specification.
 */
export function ManualCompositePanel({ strategies, dataset }: ManualCompositePanelProps) {
  const navigate = useNavigate();
  const [chosenKeys, setChosenKeys] = useState<string[]>([]);
  const [parts, setParts] = useState<Parts>({});
  const [threshold, setThreshold] = useState<number>(DEFAULT_THRESHOLD);
  const [paramsByStrategy, setParamsByStrategy] = useState<Record<string, StrategyParams>>({});

  const chosen = new Set(chosenKeys);
  const selected = strategies.filter((strategy) => chosen.has(strategyKey(strategy)));
  const atCap = selected.length >= MAX_MEMBERS;
  const total = totalParts(selected, parts);
  const spec = buildSpec(selected, parts, threshold, paramsByStrategy);
  // A lone member holds the whole grid; there is nobody to hand a part to.
  const canAdjust = selected.length > 1;

  const toggle = (strategy: StrategyMeta) => {
    const key = strategyKey(strategy);
    const nextKeys = chosen.has(key)
      ? chosenKeys.filter((held) => held !== key)
      : [...chosenKeys, key];
    setChosenKeys(nextKeys);
    setParts(balancedParts(strategies.filter((one) => nextKeys.includes(strategyKey(one)))));
  };

  const step = (strategy: StrategyMeta, delta: number) => {
    const key = strategyKey(strategy);
    setParts((current) => ({
      ...current,
      [key]: Math.min(TOTAL_PARTS, Math.max(1, (current[key] ?? 0) + delta)),
    }));
  };

  const handleParamChange = (strategy: StrategyMeta, updated: StrategyParams) => {
    const key = strategyKey(strategy);
    setParamsByStrategy((current) => ({
      ...current,
      [key]: updated,
    }));
  };

  const blockedReason = !dataset
    ? 'Chọn dataset ở cột bên phải trước khi chạy thử.'
    : selected.length === 0
      ? 'Bật ít nhất 1 strategy để dựng tổ hợp.'
      : total !== TOTAL_PARTS
        ? `Tổng trọng số đang là ${percent(total * WEIGHT_STEP)} — phải đúng 100% mới chạy được.`
        : null;

  return (
    <div className="panel composite-builder-panel">
      <div className="panel-head">
        <h2>Tổ hợp thủ công</h2>
        <span className="badge badge-neu">Đã chọn {selected.length}</span>
      </div>

      <p className="source">
        Bạn tự chọn các strategy cần kết hợp và tự chia trọng số cho từng cái, rồi chạy thử
        một lần trên màn Backtest. Khác với Không gian tìm kiếm ở trên — nơi máy tự dò từng
        tổ hợp trong phạm vi bạn khoanh.
      </p>

      <div className="strategy-grid">
        {strategies.map((strategy) => {
          const key = strategyKey(strategy);
          const isSelected = chosen.has(key);
          const held = parts[key] ?? 0;
          const currentParams = paramsByStrategy[key] ?? defaultParams(strategy);
          return (
            <div key={key} className="strategy-choice" data-selected={isSelected ? 'true' : 'false'}>
              <div className="strategy-choice-header">
                <label className="strategy-choice-main">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    disabled={!isSelected && atCap}
                    onChange={() => toggle(strategy)}
                  />
                  <span className="strategy-choice-body">
                    <span className="strategy-choice-title">{strategy.name}</span>
                    <span className="source">
                      {STRATEGY_GROUP_LABELS[strategy.group]} · v{strategy.version} · khởi động{' '}
                      {strategy.warmup} nến
                    </span>
                  </span>
                </label>

                {isSelected && (
                  <div className="weight-stepper">
                    <button
                      type="button"
                      className="btn-action btn-step"
                      aria-label={`Giảm trọng số ${strategy.name}`}
                      disabled={!canAdjust || held <= 1}
                      onClick={() => step(strategy, -1)}
                    >
                      −
                    </button>
                    <span className="composite-weight">{percent(weightOf(strategy, parts))}</span>
                    <button
                      type="button"
                      className="btn-action btn-step"
                      aria-label={`Tăng trọng số ${strategy.name}`}
                      disabled={!canAdjust || held >= TOTAL_PARTS}
                      onClick={() => step(strategy, 1)}
                    >
                      +
                    </button>
                  </div>
                )}
              </div>

              {isSelected && strategy.params.length > 0 && (
                <div className="composite-strategy-params">
                  <div className="strategy-params-header">
                    <span className="stat-tile-label">Tham số ({strategy.params.length})</span>
                  </div>
                  <DynamicParamForm
                    params={strategy.params}
                    values={currentParams}
                    onChange={(updated) => handleParamChange(strategy, updated)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {atCap && (
        <p className="source">
          Đã đạt tối đa {MAX_MEMBERS} strategy — trọng số nằm trên lưới {WEIGHT_STEP}, nhiều
          hơn thì có thành viên không còn phần nào.
        </p>
      )}

      {selected.length > 0 && (
        <div className="controls-row">
          <div className="timeframe-control">
            <label htmlFor="composite-threshold" className="stat-tile-label">
              Ngưỡng đồng thuận
            </label>
            <select
              id="composite-threshold"
              className="pair-select"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
            >
              {THRESHOLDS.map((value) => (
                <option key={value} value={value}>
                  {value.toFixed(1)}
                </option>
              ))}
            </select>
          </div>

          <button type="button" className="btn-action" onClick={() => setParts(balancedParts(selected))}>
            Chia đều lại
          </button>

          <span className="source">
            Tổng trọng số {percent(total * WEIGHT_STEP)} · điểm phải vượt ±{threshold} thì tổ
            hợp mới ra lệnh, trong khoảng đó là đứng yên.
          </span>
        </div>
      )}

      {blockedReason && <p className="state">{blockedReason}</p>}

      <button
        type="button"
        className="btn-action btn-primary start-search-btn"
        disabled={!dataset || !spec}
        onClick={() => {
          if (!dataset || !spec) return;
          navigate('/backtest', { state: { datasetId: dataset.id, spec } });
        }}
      >
        Chạy thử tổ hợp này →
      </button>
    </div>
  );
}
