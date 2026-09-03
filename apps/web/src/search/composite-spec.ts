import {
  balancedWeights,
  canonicalJson,
  MAX_MEMBERS,
  WEIGHT_STEP,
  type CandidateMember,
  type CandidateSpec,
  type StrategyMeta,
  type StrategyParams,
} from '@csl/contracts';

/**
 * Weights are handed out in whole steps of the grid rather than as fractions, because
 * that is the only arithmetic that cannot drift off it — a member holds parts, and the
 * parts of a specification add up to TOTAL_PARTS.
 */
export const TOTAL_PARTS = MAX_MEMBERS;

export type Parts = Record<string, number>;

export function strategyKey(strategy: StrategyMeta): string {
  return `${strategy.id}@${strategy.version}`;
}

export function balancedParts(selected: StrategyMeta[]): Parts {
  if (selected.length === 0) return {};
  const weights = balancedWeights(selected.length);
  return Object.fromEntries(
    selected.map((strategy, index) => [
      strategyKey(strategy),
      Math.round(weights[index] / WEIGHT_STEP),
    ]),
  );
}

export function totalParts(selected: StrategyMeta[], parts: Parts): number {
  return selected.reduce((sum, strategy) => sum + (parts[strategyKey(strategy)] ?? 0), 0);
}

export function weightOf(strategy: StrategyMeta, parts: Parts): number {
  return (parts[strategyKey(strategy)] ?? 0) * WEIGHT_STEP;
}

export type ParamsByKey = Record<string, StrategyParams>;

/** Null whenever the parts do not add up, so an invalid specification never leaves here. */
export function buildSpec(
  selected: StrategyMeta[],
  parts: Parts,
  threshold: number,
  paramsByKey: ParamsByKey,
): CandidateSpec | null {
  if (selected.length === 0) return null;
  if (totalParts(selected, parts) !== TOTAL_PARTS) return null;

  return {
    rule: 'weighted',
    threshold,
    members: selected.map((strategy): CandidateMember => {
      const params = paramsByKey[strategyKey(strategy)] ?? defaultParams(strategy);
      return {
        id: strategy.id,
        version: strategy.version,
        params,
        paramsHash: canonicalJson(params),
        weight: weightOf(strategy, parts),
      };
    }),
  };
}

export function defaultParams(strategy: StrategyMeta): StrategyParams {
  return Object.fromEntries(strategy.params.map((param) => [param.name, param.default]));
}
