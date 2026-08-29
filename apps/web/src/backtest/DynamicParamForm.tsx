import type { ParamSpec, StrategyParams } from '@csl/contracts';

interface DynamicParamFormProps {
  params: ParamSpec[];
  values: StrategyParams;
  onChange: (updated: StrategyParams) => void;
}

interface ParamMetaInfo {
  label: string;
  unit?: string;
  description?: string;
}

const PARAM_DICTIONARY: Record<string, ParamMetaInfo> = {
  fastPeriod: {
    label: 'Chu kỳ MA nhanh',
    unit: 'nến',
    description: 'Đường trung bình nhanh; cắt lên đường chậm để báo Mua',
  },
  slowPeriod: {
    label: 'Chu kỳ MA chậm',
    unit: 'nến',
    description: 'Đường trung bình chậm; dùng làm mốc xu hướng chính',
  },
  period: {
    label: 'Chu kỳ nến',
    unit: 'nến',
    description: 'Số lượng nến dùng để tính toán chỉ báo',
  },
  buyThreshold: {
    label: 'Ngưỡng kích hoạt Mua',
    description: 'Mức giá trị chỉ báo tối thiểu để tạo tín hiệu Mua',
  },
  sellThreshold: {
    label: 'Ngưỡng kích hoạt Bán',
    description: 'Mức giá trị chỉ báo tối đa để tạo tín hiệu Bán',
  },
  stdDevMultiplier: {
    label: 'Hệ số độ lệch chuẩn (StdDev)',
    description: 'Hệ số xác định độ rộng của dải Bollinger trên/dưới',
  },
  pivotLookback: {
    label: 'Số nến xét Pivot (Đỉnh/Đáy)',
    unit: 'nến',
    description: 'Số nến trước và sau để xác nhận đỉnh/đáy đảo chiều',
  },
  mergeThresholdPct: {
    label: 'Ngưỡng gộp vùng cản',
    unit: '%',
    description: 'Khoảng cách tỷ lệ phần trăm để gộp các mức cản gần nhau',
  },
  proximityPct: {
    label: 'Khoảng cách phản ứng cản',
    unit: '%',
    description: 'Biên độ % quanh vùng hỗ trợ/kháng cự để kích hoạt tín hiệu',
  },
  breakoutPct: {
    label: 'Ngưỡng xác nhận phá cản',
    unit: '%',
    description: 'Biên độ % vượt cản để xác nhận tín hiệu phá vỡ',
  },
  windowHours: {
    label: 'Cửa sổ thời gian tin tức',
    unit: 'giờ',
    description: 'Số giờ tổng hợp tin tức để đánh giá tâm lý thị trường',
  },
};

export function DynamicParamForm({
  params,
  values,
  onChange,
}: DynamicParamFormProps) {
  if (params.length === 0) {
    return <p className="source">(Strategy này không có tham số nào để tinh chỉnh)</p>;
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
            {meta?.description && (
              <span className="source" style={{ fontSize: '0.7rem', display: 'block', marginBottom: '0.2rem' }}>
                {meta.description}
              </span>
            )}
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
