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

export const maStrategyMeta: StrategyMeta = {
  id: 'ma',
  name: 'Moving Average Crossover',
  group: 'Trend',
  version: 1,
  warmup: 200,
  params: [
    { name: FAST_PERIOD, type: 'int', min: 2, max: 50, step: 1, default: 20 },
    { name: SLOW_PERIOD, type: 'int', min: 5, max: 200, step: 5, default: 50 },
  ],
};

export class MAStrategy implements Strategy {
  readonly meta = maStrategyMeta;

  constructor(private readonly params: StrategyParams) {}

  requires(params: StrategyParams): DataRequest[] {
    return [maRequest(params[FAST_PERIOD]), maRequest(params[SLOW_PERIOD])];
  }

  analyze(context: StrategyContext): Signal {
    const fast = context.get(maRequest(this.params[FAST_PERIOD]));
    const slow = context.get(maRequest(this.params[SLOW_PERIOD]));
    const current = context.index;
    const previous = current - 1;

    if (previous < 0) return hold();

    const fastPrevious = fast[previous];
    const slowPrevious = slow[previous];
    const fastCurrent = fast[current];
    const slowCurrent = slow[current];

    if (!allFinite([fastPrevious, slowPrevious, fastCurrent, slowCurrent])) return hold();
    if (fastPrevious <= slowPrevious && fastCurrent > slowCurrent) {
      return { direction: 'BUY', strength: 1 };
    }
    if (fastPrevious >= slowPrevious && fastCurrent < slowCurrent) {
      return { direction: 'SELL', strength: 1 };
    }
    return hold();
  }
}

export const maStrategyRegistration: StrategyRegistration = {
  meta: maStrategyMeta,
  create: (params) => new MAStrategy(params),
};

function maRequest(period: number): DataRequest {
  return { source: 'ma', params: { period } };
}

function hold(): Signal {
  return { direction: 'HOLD', strength: 1 };
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

