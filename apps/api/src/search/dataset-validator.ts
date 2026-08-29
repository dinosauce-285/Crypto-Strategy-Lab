import {
  DRAWDOWN_MODES,
  ENTRY_PRICES,
  PROFIT_MODES,
  TIMEFRAMES,
  type BacktestRules,
  type Dataset,
  type DrawdownMode,
  type EntryPrice,
  type ProfitMode,
  type Timeframe,
} from '@csl/contracts';
import { BadRequestException } from '@nestjs/common';

export class InvalidDatasetError extends BadRequestException {
  constructor(reason: string) {
    super(`Invalid dataset definition: ${reason}`);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateDataset(value: unknown): Omit<Dataset, 'id'> {
  if (!isRecord(value)) {
    throw new InvalidDatasetError('dataset must be an object');
  }

  const { pair, timeframe, from, to, rules } = value;

  if (typeof pair !== 'string' || pair.trim().length === 0) {
    throw new InvalidDatasetError('pair must be a non-empty string');
  }

  if (!TIMEFRAMES.includes(timeframe as Timeframe)) {
    throw new InvalidDatasetError(
      `invalid timeframe "${String(timeframe)}", expected one of ${TIMEFRAMES.join(', ')}`,
    );
  }

  if (typeof from !== 'number' || !Number.isFinite(from) || from <= 0) {
    throw new InvalidDatasetError('from timestamp must be a positive integer timestamp');
  }

  if (typeof to !== 'number' || !Number.isFinite(to) || to <= 0) {
    throw new InvalidDatasetError('to timestamp must be a positive integer timestamp');
  }

  if (from >= to) {
    throw new InvalidDatasetError(
      `from timestamp (${from}) must be strictly earlier than to timestamp (${to})`,
    );
  }

  const now = Date.now();
  const maxAllowedFrom = now + 24 * 60 * 60 * 1000;
  if (from > maxAllowedFrom) {
    throw new InvalidDatasetError(
      `from timestamp (${new Date(from).toISOString()}) cannot be in the future`,
    );
  }

  if (!isRecord(rules)) {
    throw new InvalidDatasetError('rules must be an object');
  }

  const { entryPrice, feeRate, warmupCandles, profitMode, drawdownMode } = rules;

  if (!ENTRY_PRICES.includes(entryPrice as EntryPrice)) {
    throw new InvalidDatasetError(
      `invalid entryPrice "${String(entryPrice)}", expected one of ${ENTRY_PRICES.join(', ')}`,
    );
  }

  if (!PROFIT_MODES.includes(profitMode as ProfitMode)) {
    throw new InvalidDatasetError(
      `invalid profitMode "${String(profitMode)}", expected one of ${PROFIT_MODES.join(', ')}`,
    );
  }

  if (!DRAWDOWN_MODES.includes(drawdownMode as DrawdownMode)) {
    throw new InvalidDatasetError(
      `invalid drawdownMode "${String(drawdownMode)}", expected one of ${DRAWDOWN_MODES.join(', ')}`,
    );
  }

  if (typeof feeRate !== 'string' && typeof feeRate !== 'number') {
    throw new InvalidDatasetError('feeRate must be a decimal string or number');
  }
  const feeNum = Number(feeRate);
  if (!Number.isFinite(feeNum) || feeNum < 0 || feeNum > 1) {
    throw new InvalidDatasetError(`feeRate must be a number between 0 and 1 (received "${feeRate}")`);
  }

  if (
    typeof warmupCandles !== 'number' ||
    !Number.isInteger(warmupCandles) ||
    warmupCandles < 0 ||
    warmupCandles > 10000
  ) {
    throw new InvalidDatasetError(
      `warmupCandles must be an integer between 0 and 10000 (received ${warmupCandles})`,
    );
  }

  const validatedRules: BacktestRules = {
    entryPrice: entryPrice as EntryPrice,
    feeRate: feeNum.toString(),
    warmupCandles,
    profitMode: profitMode as ProfitMode,
    drawdownMode: drawdownMode as DrawdownMode,
  };

  return {
    pair: pair.trim().toUpperCase(),
    timeframe: timeframe as Timeframe,
    from: Math.floor(from),
    to: Math.floor(to),
    rules: validatedRules,
  };
}
