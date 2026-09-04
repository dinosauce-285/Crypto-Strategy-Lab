export interface NewsFilterValues {
  coin: string;
  source: string;
  fromDate?: string;
  toDate?: string;
}

export interface CollectNewsPayload {
  coins?: string[];
  source?: string;
  limit: number;
}

const LIST_PAGE_SIZE = 50;
const DEFAULT_COLLECT_LIMIT = 20;

export function validateDateRange(fromDate?: string, toDate?: string): string | null {
  if (fromDate && toDate && new Date(fromDate).getTime() > new Date(toDate).getTime()) {
    return 'Thời gian "Từ ngày" không được sau "Đến ngày".';
  }
  return null;
}

/** A day picked in the browser means the whole day, so "to" is its last millisecond. */
function endOfDay(date: string): number {
  const at = new Date(date);
  at.setHours(23, 59, 59, 999);
  return at.getTime();
}

/**
 * What the list asks for. The date range narrows what is shown, not what is fetched from
 * the providers — collecting is a separate action with its own parameter below.
 */
export function buildNewsQuery(values: NewsFilterValues): URLSearchParams {
  const params = new URLSearchParams({ limit: String(LIST_PAGE_SIZE) });
  if (values.coin && values.coin !== 'ALL') params.set('coin', values.coin);
  if (values.source && values.source !== 'ALL') params.set('source', values.source);
  if (values.fromDate) params.set('from', String(new Date(values.fromDate).getTime()));
  if (values.toDate) params.set('to', String(endOfDay(values.toDate)));
  return params;
}

export function buildCollectNewsPayload(values: {
  coin: string;
  source: string;
  limit?: number;
}): CollectNewsPayload {
  const payload: CollectNewsPayload = {
    limit: values.limit && values.limit > 0 ? values.limit : DEFAULT_COLLECT_LIMIT,
  };
  if (values.coin && values.coin !== 'ALL') payload.coins = [values.coin];
  if (values.source && values.source !== 'ALL') payload.source = values.source;
  return payload;
}
