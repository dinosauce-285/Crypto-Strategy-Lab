import type {
  DataRequest,
  Signal,
  Strategy,
  StrategyContext,
  StrategyMeta,
  StrategyParams,
} from '@csl/contracts';
import type { StrategyRegistration } from '../strategy-registration';

const FAST_PERIOD = 'fastPeriod';
const SLOW_PERIOD = 'slowPeriod';
const SIGNAL_PERIOD = 'signalPeriod';

export const macdStrategyMeta: StrategyMeta = {
  id: 'macd',
  name: 'MACD Crossover',
  group: 'Trend',
  version: 1,
  warmup: 55,
  params: [
    { name: FAST_PERIOD, type: 'int', min: 5, max: 20, step: 1, default: 12 },
    { name: SLOW_PERIOD, type: 'int', min: 20, max: 40, step: 1, default: 26 },
    { name: SIGNAL_PERIOD, type: 'int', min: 5, max: 15, step: 1, default: 9 },
  ],
};

/** Same crossover shape as `MAStrategy`, just against the MACD line and its own signal line. */
export class MACDStrategy implements Strategy {
  readonly meta = macdStrategyMeta;

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
    if (linePrevious <= signalPrevious && lineCurrent > signalCurrent) {
      return { direction: 'BUY', strength: 1 };
    }
    if (linePrevious >= signalPrevious && lineCurrent < signalCurrent) {
      return { direction: 'SELL', strength: 1 };
    }
    return hold();
  }
}

export const macdStrategyRegistration: StrategyRegistration = {
  meta: macdStrategyMeta,
  create: (params) => new MACDStrategy(params),
};

export function macdRequest(params: StrategyParams): { line: DataRequest; signal: DataRequest } {
  const macdParams = {
    fastPeriod: params[FAST_PERIOD],
    slowPeriod: params[SLOW_PERIOD],
    signalPeriod: params[SIGNAL_PERIOD],
  };
  return {
    line: { source: 'macd.line', params: macdParams },
    signal: { source: 'macd.signal', params: macdParams },
  };
}

function hold(): Signal {
  return { direction: 'HOLD', strength: 1 };
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}
