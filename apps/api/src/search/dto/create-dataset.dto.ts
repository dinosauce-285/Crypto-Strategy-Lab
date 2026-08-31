import {
  DRAWDOWN_MODES,
  ENTRY_PRICES,
  PROFIT_MODES,
  TIMEFRAMES,
  type BacktestRules,
  type Dataset,
  type Timeframe,
} from '@csl/contracts';
import { DomainError } from '../../http/domain-error';

/** A fee above this is a typo, not a venue — 10% per side. */
const MAX_FEE_RATE = 0.1;
const MAX_WARMUP_CANDLES = 5000;

export class InvalidDatasetError extends DomainError {
  readonly status = 400;
}

const reject = (why: string): never => {
  throw new InvalidDatasetError(why);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function oneOf<T extends string>(value: unknown, allowed: readonly T[], name: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    reject(`${name} must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function parseEpoch(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    reject(`${name} must be a non-negative integer (epoch milliseconds)`);
  }
  return value as number;
}

/**
 * A fee is a decimal string so it survives the round trip without binary rounding;
 * it still has to be a number once parsed, and a negative one pays the trader to
 * lose (ADR 0034).
 */
function parseFeeRate(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    reject('rules.feeRate must be a decimal string');
  }
  const text = String(value).trim();
  const fee = Number(text);
  if (text.length === 0 || !Number.isFinite(fee)) {
    reject(`rules.feeRate must be a decimal number, got "${text}"`);
  }
  if (fee < 0) reject('rules.feeRate must not be negative — a fee is paid, not earned');
  if (fee > MAX_FEE_RATE) reject(`rules.feeRate must not exceed ${MAX_FEE_RATE} (10% per side)`);
  return text;
}

function parseRules(value: unknown): BacktestRules {
  if (!isRecord(value)) reject('rules is required');
  const source = value as Record<string, unknown>;
  const warmupCandles = source.warmupCandles;
  if (
    typeof warmupCandles !== 'number' ||
    !Number.isInteger(warmupCandles) ||
    warmupCandles < 0 ||
    warmupCandles > MAX_WARMUP_CANDLES
  ) {
    reject(`rules.warmupCandles must be an integer between 0 and ${MAX_WARMUP_CANDLES}`);
  }
  return {
    entryPrice: oneOf(source.entryPrice, ENTRY_PRICES, 'rules.entryPrice'),
    feeRate: parseFeeRate(source.feeRate),
    warmupCandles: warmupCandles as number,
    profitMode: oneOf(source.profitMode, PROFIT_MODES, 'rules.profitMode'),
    drawdownMode: oneOf(source.drawdownMode, DRAWDOWN_MODES, 'rules.drawdownMode'),
  };
}

export function parseCreateDataset(body: unknown, now: number): Omit<Dataset, 'id'> {
  if (!isRecord(body)) reject('a dataset body is required');
  const source = body as Record<string, unknown>;

  const pair = typeof source.pair === 'string' ? source.pair.trim().toUpperCase() : '';
  if (pair.length === 0) reject('pair is required');

  const from = parseEpoch(source.from, 'from');
  const to = parseEpoch(source.to, 'to');
  if (from >= to) reject('from must be before to');
  if (from > now) reject('from must not be in the future — no exchange has those candles yet');

  return {
    pair,
    timeframe: oneOf<Timeframe>(source.timeframe, TIMEFRAMES, 'timeframe'),
    from,
    to,
    rules: parseRules(source.rules),
  };
}
