import {
  canonicalJson,
  type CandidateMember,
  type CandidateSpec,
  type StrategyGroup,
  type StrategyMeta,
  type StrategyParams,
} from '@csl/contracts';

export type RandomFn = () => number;

const DEFAULT_THRESHOLD = 0.3;
const GROUP_ORDER: readonly StrategyGroup[] = [
  'Trend',
  'Momentum',
  'Structure',
  'Volatility',
  'Information',
];

export function buildCandidate(metas: readonly StrategyMeta[], random: RandomFn): CandidateSpec {
  const ordered = [...metas].sort(compareMeta);
  const weights = balancedWeights(ordered.length);
  return {
    rule: 'weighted',
    threshold: DEFAULT_THRESHOLD,
    members: ordered.map((meta, index): CandidateMember => {
      const params = chooseParams(meta, random);
      return {
        id: meta.id,
        version: meta.version,
        params,
        paramsHash: canonicalJson(params),
        weight: weights[index],
      };
    }),
  };
}

export function choose<T>(values: readonly T[], random: RandomFn): T {
  if (values.length === 0) throw new Error('cannot choose from an empty set');
  return values[Math.min(values.length - 1, Math.floor(random() * values.length))];
}

export function shuffle<T>(values: readonly T[], random: RandomFn): T[] {
  const copy = [...values];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function balancedWeights(count: number): number[] {
  if (!Number.isInteger(count) || count < 1 || count > 10) {
    throw new Error('candidate member count must be between 1 and 10');
  }
  const base = Math.floor(10 / count);
  const extra = 10 - base * count;
  return Array.from({ length: count }, (_, index) => (base + (index < extra ? 1 : 0)) / 10);
}

function chooseParams(meta: StrategyMeta, random: RandomFn): StrategyParams {
  return Object.fromEntries(
    meta.params.map((param) => {
      if (param.step <= 0 || param.max < param.min) {
        throw new Error(`strategy "${meta.id}" has an invalid range for "${param.name}"`);
      }
      const steps = Math.floor((param.max - param.min) / param.step);
      const value = param.min + Math.floor(random() * (steps + 1)) * param.step;
      return [param.name, param.type === 'int' ? Math.round(value) : round(value)];
    }),
  );
}

function round(value: number): number {
  return Number(value.toFixed(6));
}

function compareMeta(a: StrategyMeta, b: StrategyMeta): number {
  return groupRank(a.group) - groupRank(b.group) || a.id.localeCompare(b.id);
}

function groupRank(group: StrategyGroup): number {
  const index = GROUP_ORDER.indexOf(group);
  return index === -1 ? GROUP_ORDER.length : index;
}
