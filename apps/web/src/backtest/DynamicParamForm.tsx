import { useState } from 'react';
import type { ParamSpec, StrategyParams } from '@csl/contracts';
import { PARAM_DICTIONARY } from './param-labels';

interface DynamicParamFormProps {
  params: ParamSpec[];
  values: StrategyParams;
  onChange: (updated: StrategyParams) => void;
}

export function DynamicParamForm({
  params,
  values,
  onChange,
}: DynamicParamFormProps) {
  const [inputStrings, setInputStrings] = useState<Record<string, string>>({});

  if (params.length === 0) {
    return <p className="source">(Strategy này không có tham số nào để tinh chỉnh)</p>;
  }

  const handleChange = (name: string, rawVal: string, spec: ParamSpec) => {
    setInputStrings((prev) => ({ ...prev, [name]: rawVal }));
    if (rawVal === '') {
      return;
    }
    const num = spec.type === 'int' ? parseInt(rawVal, 10) : parseFloat(rawVal);
    if (!Number.isNaN(num)) {
      onChange({
        ...values,
        [name]: num,
      });
    }
  };

  const handleBlur = (name: string, spec: ParamSpec) => {
    const rawVal = inputStrings[name];
    if (rawVal === undefined) return;

    if (rawVal === '') {
      const resetVal = spec.default;
      setInputStrings((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      onChange({ ...values, [name]: resetVal });
      return;
    }

    const num = spec.type === 'int' ? parseInt(rawVal, 10) : parseFloat(rawVal);
    if (Number.isNaN(num)) {
      const resetVal = spec.default;
      setInputStrings((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      onChange({ ...values, [name]: resetVal });
    } else {
      const clamped = Math.max(spec.min, Math.min(spec.max, num));
      setInputStrings((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
      onChange({ ...values, [name]: clamped });
    }
  };

  return (
    <div className="dynamic-params-grid">
      {params.map((param) => {
        const rawString = inputStrings[param.name];
        const currentVal = rawString !== undefined ? rawString : (values[param.name] ?? param.default);
        const numVal = typeof currentVal === 'number' ? currentVal : parseFloat(String(currentVal));
        const isOutOfRange = !Number.isNaN(numVal) && (numVal < param.min || numVal > param.max);

        const meta = PARAM_DICTIONARY[param.name];
        const labelText = meta?.label ?? param.name;
        const unitText = meta?.unit ? ` (${meta.unit})` : '';

        return (
          <div key={param.name} className="param-field">
            <div className="param-field-head">
              <label htmlFor={`param-${param.name}`} className="stat-tile-label">
                {labelText}{unitText}
              </label>
              <span className="source">
                [{param.min} .. {param.max}]
              </span>
            </div>
            {meta?.description && <span className="stat-tile-note">{meta.description}</span>}
            <input
              id={`param-${param.name}`}
              type="number"
              className="pair-select"
              aria-invalid={isOutOfRange}
              min={param.min}
              max={param.max}
              step={param.step}
              value={currentVal}
              onChange={(e) => handleChange(param.name, e.target.value, param)}
              onBlur={() => handleBlur(param.name, param)}
            />
            {isOutOfRange && (
              <span className="field-error">
                Giá trị hợp lệ từ {param.min} đến {param.max}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
