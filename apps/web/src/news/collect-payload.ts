export interface CollectNewsFormValues {
  coin: string;
  source: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export interface CollectNewsPayload {
  coins?: string[];
  source?: string;
  from?: number;
  to?: number;
  limit: number;
}

export function validateDateRange(fromDate?: string, toDate?: string): string | null {
  if (fromDate && toDate && new Date(fromDate).getTime() > new Date(toDate).getTime()) {
    return 'Thời gian "Từ ngày" không được sau "Đến ngày".';
  }
  return null;
}

export function buildCollectNewsPayload(values: CollectNewsFormValues): CollectNewsPayload {
  const limit = values.limit && values.limit > 0 ? values.limit : 20;
  const body: CollectNewsPayload = { limit };

  if (values.coin && values.coin !== 'ALL') {
    body.coins = [values.coin];
  }
  if (values.source && values.source !== 'ALL') {
    body.source = values.source;
  }
  if (values.fromDate) {
    body.from = new Date(values.fromDate).getTime();
  }
  if (values.toDate) {
    const endOfDay = new Date(values.toDate);
    endOfDay.setHours(23, 59, 59, 999);
    body.to = endOfDay.getTime();
  }

  return body;
}
