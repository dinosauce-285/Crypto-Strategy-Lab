import type {
  DataRequest,
  Signal,
  Strategy,
  StrategyContext,
  StrategyMeta,
  StrategyParams,
} from '@csl/contracts';
import type { StrategyRegistration } from '../strategy-registration';

const PERIOD = 'period';
const BUY_THRESHOLD = 'buyThreshold';
const SELL_THRESHOLD = 'sellThreshold';

export const rsiStrategyMeta: StrategyMeta = {
  id: 'rsi',
  name: 'RSI Reversal',
  group: 'Momentum',
  version: 1,
  warmup: 21,
  params: [
    { name: PERIOD, type: 'int', min: 14, max: 21, step: 7, default: 14 },
    { name: BUY_THRESHOLD, type: 'int', min: 20, max: 35, step: 5, default: 30 },
    { name: SELL_THRESHOLD, type: 'int', min: 65, max: 80, step: 5, default: 70 },
  ],
};

export class RSIStrategy implements Strategy {
  readonly meta = rsiStrategyMeta;

  constructor(private readonly params: StrategyParams) {}

  requires(params: StrategyParams): DataRequest[] {
    return [rsiRequest(params[PERIOD])];
  }

  analyze(context: StrategyContext): Signal {
    const value = context.get(rsiRequest(this.params[PERIOD]))[context.index];

    if (!Number.isFinite(value)) return hold();
    if (value < this.params[BUY_THRESHOLD]) {
      return {
        direction: 'BUY',
        strength: clamp((this.params[BUY_THRESHOLD] - value) / this.params[BUY_THRESHOLD]),
      };
    }
    if (value > this.params[SELL_THRESHOLD]) {
      return {
        direction: 'SELL',
        strength: clamp((value - this.params[SELL_THRESHOLD]) / (100 - this.params[SELL_THRESHOLD])),
      };
    }
    return hold();
  }
}

export const rsiStrategyRegistration: StrategyRegistration = {
  meta: rsiStrategyMeta,
  create: (params) => new RSIStrategy(params),
};

function rsiRequest(period: number): DataRequest {
  return { source: 'rsi', params: { period } };
}

function hold(): Signal {
  return { direction: 'HOLD', strength: 1 };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
