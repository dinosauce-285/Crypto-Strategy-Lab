import {
  MERGE_RULES,
  type CandidateMember,
  type CandidateSpec,
  type MergeRule,
  type StrategyParams,
} from '@csl/contracts';

export class InvalidSpecError extends Error {}

const GRID = 0.1;

function reject(why: string): never {
  throw new InvalidSpecError(why);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isMergeRule = (value: unknown): value is MergeRule =>
  MERGE_RULES.some((known) => known === value);

const onGrid = (value: number): boolean => Math.abs(value / GRID - Math.round(value / GRID)) < 1e-9;

const inUnitRange = (value: unknown): value is number =>
  typeof value === 'number' && value > 0 && value < 1 && onGrid(value);

function readParams(value: unknown, id: string): StrategyParams {
  if (!isRecord(value)) reject(`member ${id} has no params`);
  const params: StrategyParams = {};
  for (const [key, param] of Object.entries(value)) {
    if (typeof param !== 'number' || !Number.isFinite(param)) {
      reject(`member ${id} has a non-numeric param "${key}"`);
    }
    params[key] = param;
  }
  return params;
}

function readMember(value: unknown): CandidateMember {
  if (!isRecord(value)) reject('a member is not an object');
  const { id, version, params, paramsHash, weight } = value;
  if (typeof id !== 'string' || id.length === 0) reject('a member has no id');
  if (typeof version !== 'number' || !Number.isInteger(version)) reject(`member ${id} has no version`);
  if (typeof paramsHash !== 'string' || paramsHash.length === 0) reject(`member ${id} has no paramsHash`);
  if (!inUnitRange(weight)) reject(`member ${id} has a weight outside (0,1) on the 0.1 grid`);
  return { id, version, params: readParams(params, id), paramsHash, weight };
}

/**
 * The check ADR 0007 says has to exist, at the end it says it belongs: the worker, where
 * the untyped value from the queue becomes an object. Anything it rejects is broken in a
 * way a second attempt cannot fix.
 */
export function validateSpec(value: unknown): CandidateSpec {
  if (!isRecord(value)) reject('the specification is not an object');
  const { rule, threshold, members } = value;
  if (!isMergeRule(rule)) reject(`unknown merge rule "${String(rule)}"`);
  if (!inUnitRange(threshold)) reject('the threshold is outside (0,1) on the 0.1 grid');
  if (!Array.isArray(members) || members.length === 0) reject('the specification has no members');
  const read = members.map(readMember);
  const total = Number(read.reduce((sum, member) => sum + member.weight, 0).toFixed(6));
  if (total !== 1) reject(`member weights sum to ${total}, not 1`);
  return { rule, threshold, members: read };
}
