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
const STD_DEV_MULTIPLIER = 'stdDevMultiplier';

export const bollingerStrategyMeta: StrategyMeta = {
  id: 'bollinger',
  name: 'Bollinger Band Reversion',
  group: 'Volatility',
  version: 1,
  warmup: 50,
  params: [
    { name: PERIOD, type: 'int', min: 10, max: 50, step: 5, default: 20 },
    { name: STD_DEV_MULTIPLIER, type: 'float', min: 1.5, max: 3, step: 0.5, default: 2 },
  ],
};

export class BollingerStrategy implements Strategy {
  readonly meta = bollingerStrategyMeta;

  constructor(private readonly params: StrategyParams) {}

  requires(params: StrategyParams): DataRequest[] {
    return [bollingerRequest('lower', params), bollingerRequest('upper', params)];
  }

  analyze(context: StrategyContext): Signal {
    const close = Number(context.candles[context.index]?.close);
    const lower = context.get(bollingerRequest('lower', this.params))[context.index];
    const upper = context.get(bollingerRequest('upper', this.params))[context.index];

    if (!allFinite([close, lower, upper]) || upper <= lower) return hold();

    const percentB = (close - lower) / (upper - lower);
    if (percentB < 0) return { direction: 'BUY', strength: clamp(-percentB) };
    if (percentB > 1) return { direction: 'SELL', strength: clamp(percentB - 1) };
    return hold();
  }
}

export const bollingerStrategyRegistration: StrategyRegistration = {
  meta: bollingerStrategyMeta,
  create: (params) => new BollingerStrategy(params),
};

function bollingerRequest(field: 'lower' | 'upper', params: StrategyParams): DataRequest {
  return {
    source: `bollinger.${field}`,
    params: {
      period: params[PERIOD],
      stdDevMultiplier: params[STD_DEV_MULTIPLIER],
    },
  };
}

function hold(): Signal {
  return { direction: 'HOLD', strength: 1 };
}

function allFinite(values: readonly number[]): boolean {
  return values.every(Number.isFinite);
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
