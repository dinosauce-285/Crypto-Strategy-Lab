import type {
  DataRequest,
  Signal,
  Strategy,
  StrategyContext,
  StrategyMeta,
  StrategyParams,
} from '@csl/contracts';
import type { StrategyRegistration } from '../strategy-registration';

const PIVOT_LOOKBACK = 'pivotLookback';
const MERGE_THRESHOLD_PCT = 'mergeThresholdPct';
const PROXIMITY_PCT = 'proximityPct';
const BREAKOUT_PCT = 'breakoutPct';

export const supportResistanceStrategyMeta: StrategyMeta = {
  id: 'support-resistance',
  name: 'Support Resistance Reaction',
  group: 'Structure',
  version: 1,
  warmup: 20,
  params: [
    { name: PIVOT_LOOKBACK, type: 'int', min: 2, max: 10, step: 1, default: 5 },
    { name: MERGE_THRESHOLD_PCT, type: 'float', min: 0.1, max: 1.5, step: 0.1, default: 0.5 },
    { name: PROXIMITY_PCT, type: 'float', min: 0.1, max: 2, step: 0.1, default: 0.5 },
    { name: BREAKOUT_PCT, type: 'float', min: 0, max: 2, step: 0.1, default: 0.2 },
  ],
};

export class SupportResistanceStrategy implements Strategy {
  readonly meta = supportResistanceStrategyMeta;

  constructor(private readonly params: StrategyParams) {}

  requires(params: StrategyParams): DataRequest[] {
    const indicatorParams = supportResistanceParams(params);
    return [
      { source: 'support-resistance.support', params: indicatorParams },
      { source: 'support-resistance.resistance', params: indicatorParams },
    ];
  }

  analyze(context: StrategyContext): Signal {
    const current = context.index;
    const previous = current - 1;
    const close = Number(context.candles[current]?.close);
    const previousClose = Number(context.candles[previous]?.close);
    const support = context.get(supportRequest(this.params))[current];
    const resistance = context.get(resistanceRequest(this.params))[current];
    const previousResistance = previous >= 0 ? context.get(resistanceRequest(this.params))[previous] : NaN;

    if (!Number.isFinite(close)) return hold();
    if (isBreakout(previousClose, close, previousResistance, this.params[BREAKOUT_PCT])) {
      return { direction: 'BUY', strength: breakoutStrength(close, previousResistance, this.params[BREAKOUT_PCT]) };
    }
    if (Number.isFinite(support) && isNear(close, support, this.params[PROXIMITY_PCT])) {
      return { direction: 'BUY', strength: proximityStrength(close, support, this.params[PROXIMITY_PCT]) };
    }
    if (Number.isFinite(resistance) && isNear(close, resistance, this.params[PROXIMITY_PCT])) {
      return { direction: 'SELL', strength: proximityStrength(close, resistance, this.params[PROXIMITY_PCT]) };
    }
    return hold();
  }
}

export const supportResistanceStrategyRegistration: StrategyRegistration = {
  meta: supportResistanceStrategyMeta,
  create: (params) => new SupportResistanceStrategy(params),
};

function supportRequest(params: StrategyParams): DataRequest {
  return { source: 'support-resistance.support', params: supportResistanceParams(params) };
}

function resistanceRequest(params: StrategyParams): DataRequest {
  return { source: 'support-resistance.resistance', params: supportResistanceParams(params) };
}

function supportResistanceParams(params: StrategyParams): StrategyParams {
  return {
    pivotLookback: params[PIVOT_LOOKBACK],
    mergeThresholdPct: params[MERGE_THRESHOLD_PCT],
  };
}

function isNear(price: number, level: number, proximityPct: number): boolean {
  return distancePct(price, level) <= proximityPct;
}

function isBreakout(previousClose: number, close: number, resistance: number, breakoutPct: number): boolean {
  if (!allFinite([previousClose, close, resistance])) return false;
  return previousClose <= resistance && close > resistance * (1 + breakoutPct / 100);
}

function proximityStrength(price: number, level: number, proximityPct: number): number {
  return clamp(1 - distancePct(price, level) / proximityPct);
}

function breakoutStrength(close: number, resistance: number, breakoutPct: number): number {
  const requiredMove = Math.max(breakoutPct, 0.1);
  return clamp(distancePct(close, resistance) / requiredMove);
}

function distancePct(price: number, level: number): number {
  return (Math.abs(price - level) / level) * 100;
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
