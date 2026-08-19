import type { Candle, Timeframe } from '@csl/contracts';

export interface PriceTick {
  pair: string;
  price: string;
  at: number;
}

export interface ExchangeStreamHandlers {
  price: (tick: PriceTick) => void;
  candle: (candle: Candle) => void;
}

/**
 * One live connection to one pair. Timeframes are added and removed on it, so four
 * charts on the same pair cost one connection rather than four.
 */
export interface ExchangeStream {
  addTimeframe(timeframe: Timeframe): void;
  removeTimeframe(timeframe: Timeframe): void;
  close(): void;
}

/** Behind this, nothing knows which exchange the data came from. */
export abstract class ExchangeStreamPort {
  abstract open(pair: string, handlers: ExchangeStreamHandlers): ExchangeStream;
}
