import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Candle, Timeframe } from '@csl/contracts';
import { ExchangeHistoryPort } from './ports/exchange-history.port';

type BinanceKlineRow = [
  number, // open time
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  ...unknown[],
];

const DEFAULT_URL = 'https://api.binance.com';

@Injectable()
export class BinanceRestAdapter extends ExchangeHistoryPort {
  private readonly logger = new Logger(BinanceRestAdapter.name);

  constructor(private readonly config: ConfigService) {
    super();
  }

  async fetchKlines(pair: string, timeframe: Timeframe, limit: number): Promise<Candle[]> {
    const base = this.config.get<string>('BINANCE_REST_URL', DEFAULT_URL);
    const url = `${base}/api/v3/klines?symbol=${pair}&interval=${timeframe}&limit=${limit}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Binance klines request failed: HTTP ${response.status}`);
    }

    const rows = (await response.json()) as BinanceKlineRow[];
    return rows.map((row) => toCandle(row, pair, timeframe));
  }
}

function toCandle(row: BinanceKlineRow, pair: string, timeframe: Timeframe): Candle {
  const [openTime, open, high, low, close, volume] = row;
  return { pair, timeframe, openTime, open, high, low, close, volume, closed: true };
}
