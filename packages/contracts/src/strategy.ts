import type { Candle } from './market';
import type { Signal } from './signal';

/** Section 17's five functional groups. Domain-guided search composes by this field. */
export const STRATEGY_GROUPS = [
  'Trend',
  'Momentum',
  'Volatility',
  'Structure',
  'Information',
] as const;
export type StrategyGroup = (typeof STRATEGY_GROUPS)[number];

export type ParamType = 'int' | 'float';

/**
 * `min`, `max` and `step` are what the search engine walks; without them it would
 * have to invent bounds for parameters it knows nothing about.
 */
export interface ParamSpec {
  name: string;
  type: ParamType;
  min: number;
  max: number;
  step: number;
  default: number;
}

export type StrategyParams = Record<string, number>;

/**
 * A strategy's own description of itself. The parameter form, the search space and
 * the selection list are generated from this, so none of them holds a strategy name.
 *
 * `version` is set by hand and bumped whenever a change alters what `analyze`
 * returns for the same input; the parameter half of a strategy's identity is
 * hashed by machine and lives on `CandidateMember`.
 */
export interface StrategyMeta {
  id: string;
  name: string;
  group: StrategyGroup;
  version: number;
  /** Candles needed before this strategy can say anything. */
  warmup: number;
  params: ParamSpec[];
}

/** One thing a strategy needs the engine to prepare — an indicator, a stored score. */
export interface DataRequest {
  source: string;
  params: StrategyParams;
}

/**
 * Everything a strategy is allowed to see. A strategy never reaches past this into
 * the database or an exchange.
 *
 * `get` is a lookup, not a computation: it returns what the engine already prepared
 * from this strategy's own `requires`, as a series aligned to `candles`. Asking for
 * anything that was not declared is an error rather than a late calculation.
 */
export interface StrategyContext {
  candles: readonly Candle[];
  index: number;
  get(request: DataRequest): readonly number[];
}

/**
 * `requires` takes the parameters rather than reading them off the instance because
 * the search engine varies them — RSI 14 this candidate, RSI 21 the next — so the
 * needs of a strategy are a function of its numbers, not a fixed list.
 */
export interface Strategy {
  readonly meta: StrategyMeta;
  requires(params: StrategyParams): DataRequest[];
  analyze(context: StrategyContext): Signal;
}
