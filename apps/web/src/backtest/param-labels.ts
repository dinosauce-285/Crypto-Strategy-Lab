import type { StrategyParams } from '@csl/contracts';

export interface ParamMetaInfo {
  label: string;
  /** For a table cell or a one-line summary, where the full label does not fit. */
  short: string;
  unit?: string;
  description?: string;
}

export const PARAM_DICTIONARY: Record<string, ParamMetaInfo> = {
  fastPeriod: {
    label: 'Chu kỳ MA nhanh',
    short: 'MA nhanh',
    unit: 'nến',
    description: 'Đường trung bình nhanh; cắt lên đường chậm để báo Mua',
  },
  slowPeriod: {
    label: 'Chu kỳ MA chậm',
    short: 'MA chậm',
    unit: 'nến',
    description: 'Đường trung bình chậm; dùng làm mốc xu hướng chính',
  },
  period: {
    label: 'Chu kỳ nến',
    short: 'chu kỳ',
    unit: 'nến',
    description: 'Số lượng nến dùng để tính toán chỉ báo',
  },
  buyThreshold: {
    label: 'Ngưỡng kích hoạt Mua',
    short: 'ngưỡng Mua',
    description: 'Mức giá trị chỉ báo tối thiểu để tạo tín hiệu Mua',
  },
  sellThreshold: {
    label: 'Ngưỡng kích hoạt Bán',
    short: 'ngưỡng Bán',
    description: 'Mức giá trị chỉ báo tối đa để tạo tín hiệu Bán',
  },
  stdDevMultiplier: {
    label: 'Hệ số độ lệch chuẩn (StdDev)',
    short: 'hệ số StdDev',
    description: 'Hệ số xác định độ rộng của dải Bollinger trên/dưới',
  },
  pivotLookback: {
    label: 'Số nến xét Pivot (Đỉnh/Đáy)',
    short: 'nến Pivot',
    unit: 'nến',
    description: 'Số nến trước và sau để xác nhận đỉnh/đáy đảo chiều',
  },
  mergeThresholdPct: {
    label: 'Ngưỡng gộp vùng cản',
    short: 'gộp cản',
    unit: '%',
    description: 'Khoảng cách tỷ lệ phần trăm để gộp các mức cản gần nhau',
  },
  proximityPct: {
    label: 'Khoảng cách phản ứng cản',
    short: 'khoảng cách cản',
    unit: '%',
    description: 'Biên độ % quanh vùng hỗ trợ/kháng cự để kích hoạt tín hiệu',
  },
  breakoutPct: {
    label: 'Ngưỡng xác nhận phá cản',
    short: 'phá cản',
    unit: '%',
    description: 'Biên độ % vượt cản để xác nhận tín hiệu phá vỡ',
  },
  windowHours: {
    label: 'Cửa sổ thời gian tin tức',
    short: 'cửa sổ tin',
    unit: 'giờ',
    description: 'Số giờ tổng hợp tin tức để đánh giá tâm lý thị trường',
  },
};

/** The parameter's own name when the dictionary has never heard of it. */
export function paramShort(name: string): string {
  return PARAM_DICTIONARY[name]?.short ?? name;
}

/** The short form drops the unit too: it goes where every character costs a table row. */
export function formatParam(name: string, value: number, form: 'short' | 'long' = 'short'): string {
  const meta = PARAM_DICTIONARY[name];
  if (form === 'short') return `${paramShort(name)} ${value}`;
  const unit = meta?.unit ? ` ${meta.unit}` : '';
  return `${meta?.label ?? name} ${value}${unit}`;
}

export function formatParams(
  params: StrategyParams,
  form: 'short' | 'long' = 'short',
): string {
  return Object.entries(params)
    .map(([name, value]) => formatParam(name, value, form))
    .join(' · ');
}
