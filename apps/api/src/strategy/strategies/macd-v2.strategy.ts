import type {
  DataRequest,
  Signal,
  Strategy,
  StrategyContext,
  StrategyMeta,
  StrategyParams,
} from '@csl/contracts';
import type { StrategyRegistration } from '../strategy-registration';
import { macdRequest } from './macd.strategy';

const FAST_PERIOD = 'fastPeriod';
const SLOW_PERIOD = 'slowPeriod';
const SIGNAL_PERIOD = 'signalPeriod';

export const macdV2StrategyMeta: StrategyMeta = {
  id: 'macd',
  name: 'MACD Crossover (Zero-Line Confirmed)',
  group: 'Trend',
  version: 2,
  warmup: 55,
  params: [
    { name: FAST_PERIOD, type: 'int', min: 5, max: 20, step: 1, default: 12 },
    { name: SLOW_PERIOD, type: 'int', min: 20, max: 40, step: 1, default: 26 },
    { name: SIGNAL_PERIOD, type: 'int', min: 5, max: 15, step: 1, default: 9 },
  ],
};

/**
 * `v1`'s crossover plus a zero-line filter: a bullish cross only counts as BUY if the
 * MACD line has already climbed above zero, a bearish cross only counts as SELL if it
 * has already dropped below zero. A cross on the wrong side of zero means momentum
 * reversed but the broader trend it is crossing into hasn't confirmed yet — `v1` would
 * act on it, `v2` holds instead. Registered as its own `version` (not an edit to `v1`)
 * so every Experiment that already names `macd@1` keeps meaning exactly what it always
 * did (ADR 0009).
 */
export class MACDStrategyV2 implements Strategy {
  readonly meta = macdV2StrategyMeta;

  constructor(private readonly params: StrategyParams) {}

  requires(params: StrategyParams): DataRequest[] {
    const { line, signal } = macdRequest(params);
    return [line, signal];
  }

  analyze(context: StrategyContext): Signal {
    const { line: lineRequest, signal: signalRequest } = macdRequest(this.params);
    const line = context.get(lineRequest);
    const signal = context.get(signalRequest);
    const current = context.index;
    const previous = current - 1;

    if (previous < 0) return hold();

    const linePrevious = line[previous];
    const signalPrevious = signal[previous];
    const lineCurrent = line[current];
    const signalCurrent = signal[current];

    if (!allFinite([linePrevious, signalPrevious, lineCurrent, signalCurrent])) return hold();

    const crossedUp = linePrevious <= signalPrevious && lineCurrent > signalCurrent;
    const crossedDown = linePrevious >= signalPrevious && lineCurrent < signalCurrent;

    if (crossedUp && lineCurrent > 0) return { direction: 'BUY', strength: 1 };
    if (crossedDown && lineCurrent < 0) return { direction: 'SELL', strength: 1 };
    return hold();
  }
}

export const macdV2StrategyRegistration: StrategyRegistration = {
  meta: macdV2StrategyMeta,
  create: (params) => new MACDStrategyV2(params),
};

function hold(): Signal {
  return { direction: 'HOLD', strength: 1 };
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}
