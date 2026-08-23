import type { StrategyMeta, StrategyRef } from '@csl/contracts';

interface StrategySpacePickerProps {
  strategies: StrategyMeta[];
  selectedRefs: StrategyRef[];
  disabled: boolean;
  onChange: (refs: StrategyRef[]) => void;
}

export function StrategySpacePicker({
  strategies,
  selectedRefs,
  disabled,
  onChange,
}: StrategySpacePickerProps) {
  const selected = new Set(selectedRefs.map(strategyKey));

  const toggle = (ref: StrategyRef) => {
    const key = strategyKey(ref);
    if (selected.has(key)) {
      onChange(selectedRefs.filter((candidate) => strategyKey(candidate) !== key));
      return;
    }
    onChange([...selectedRefs, ref]);
  };

  return (
    <div className="panel search-space-panel">
      <div className="panel-head">
        <h2>Search Space</h2>
        <span className="badge badge-neu">{selectedRefs.length} selected</span>
      </div>

      <div className="strategy-grid">
        {strategies.map((strategy) => {
          const ref = { id: strategy.id, version: strategy.version };
          const key = strategyKey(ref);
          const isSelected = selected.has(key);
          return (
            <label
              key={key}
              className="strategy-choice"
              data-selected={isSelected ? 'true' : 'false'}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled}
                onChange={() => toggle(ref)}
              />
              <span className="strategy-choice-body">
                <span className="strategy-choice-title">{strategy.name}</span>
                <span className="source">
                  {strategy.group} / v{strategy.version} / warmup {strategy.warmup}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function strategyKey(ref: StrategyRef): string {
  return `${ref.id}@${ref.version}`;
}
