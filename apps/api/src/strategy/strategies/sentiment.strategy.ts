import type {
  DataRequest,
  Signal,
  Strategy,
  StrategyContext,
  StrategyMeta,
  StrategyParams,
} from '@csl/contracts';
import type { StrategyRegistration } from '../strategy-registration';

const BUY_THRESHOLD = 'buyThreshold';
const SELL_THRESHOLD = 'sellThreshold';
const WINDOW_HOURS = 'windowHours';

export const sentimentStrategyMeta: StrategyMeta = {
  id: 'sentiment',
  name: 'News Sentiment',
  group: 'Information',
  version: 1,
  warmup: 0,
  params: [
    { name: BUY_THRESHOLD, type: 'float', min: 0.1, max: 0.9, step: 0.05, default: 0.7 },
    { name: SELL_THRESHOLD, type: 'float', min: -0.9, max: -0.1, step: 0.05, default: -0.7 },
    { name: WINDOW_HOURS, type: 'int', min: 1, max: 24, step: 1, default: 1 },
  ],
};

export class SentimentStrategy implements Strategy {
  readonly meta = sentimentStrategyMeta;

  constructor(private readonly params: StrategyParams) {}

  requires(params: StrategyParams): DataRequest[] {
    return [sentimentRequest(params)];
  }

  analyze(context: StrategyContext): Signal {
    const score = context.get(sentimentRequest(this.params))[context.index];

    if (!Number.isFinite(score)) return hold();
    if (score >= this.params[BUY_THRESHOLD]) {
      return {
        direction: 'BUY',
        strength: clamp(score),
      };
    }
    if (score <= this.params[SELL_THRESHOLD]) {
      return {
        direction: 'SELL',
        strength: clamp(Math.abs(score)),
      };
    }
    return hold();
  }
}

export const sentimentStrategyRegistration: StrategyRegistration = {
  meta: sentimentStrategyMeta,
  create: (params) => new SentimentStrategy(params),
};

function sentimentRequest(params: StrategyParams): DataRequest {
  return {
    source: 'sentiment',
    params: {
      windowHours: params[WINDOW_HOURS] ?? 1,
    },
  };
}

function hold(): Signal {
  return { direction: 'HOLD', strength: 1 };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}
