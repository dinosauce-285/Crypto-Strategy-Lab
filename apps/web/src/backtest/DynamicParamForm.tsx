import type { ParamSpec, StrategyParams } from '@csl/contracts';

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
  if (params.length === 0) {
    return <p className="source">(No tunable parameters for this strategy)</p>;
  }

  const handleChange = (name: string, rawVal: string, spec: ParamSpec) => {
    const num = spec.type === 'int' ? parseInt(rawVal, 10) : parseFloat(rawVal);
    if (!Number.isNaN(num)) {
      onChange({
        ...values,
        [name]: num,
      });
    }
  };

  return (
    <div className="dynamic-params-grid">
      {params.map((param) => {
        const currentVal = values[param.name] ?? param.default;
        return (
          <div key={param.name} className="param-field">
            <div className="param-field-head">
              <label htmlFor={`param-${param.name}`} className="stat-tile-label">
                {param.name} ({param.type})
              </label>
              <span className="source">
                [{param.min} .. {param.max}]
              </span>
            </div>
            <div className="controls-row">
              <input
                id={`param-${param.name}`}
                type="number"
                className="pair-select"
                style={{ width: '100%' }}
                min={param.min}
                max={param.max}
                step={param.step}
                value={currentVal}
                onChange={(e) => handleChange(param.name, e.target.value, param)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
