import {
  MERGE_RULES,
  type CandidateMember,
  type CandidateSpec,
  type MergeRule,
  type StrategyParams,
} from '@csl/contracts';
import { DomainError } from '../http/domain-error';

export class InvalidSpecError extends DomainError {
  readonly status = 400;
}

const GRID = 0.1;

function reject(why: string): never {
  throw new InvalidSpecError(why);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isMergeRule = (value: unknown): value is MergeRule =>
  MERGE_RULES.some((known) => known === value);

const onGrid = (value: number): boolean => Math.abs(value / GRID - Math.round(value / GRID)) < 1e-9;

const isThreshold = (value: unknown): value is number =>
  typeof value === 'number' && value > 0 && value < 1 && onGrid(value);

const isWeight = (value: unknown): value is number =>
  typeof value === 'number' && value > 0 && value <= 1 && onGrid(value);

const memberKey = (member: CandidateMember): string =>
  `${member.id}@${member.version}/${member.paramsHash}`;

function readParams(value: unknown, id: string): StrategyParams {
  if (!isRecord(value)) reject(`Chiến lược "${id}" trong tổ hợp thiếu phần tham số.`);
  const params: StrategyParams = {};
  for (const [key, param] of Object.entries(value)) {
    if (typeof param !== 'number' || !Number.isFinite(param)) {
      reject(`Tham số "${key}" của chiến lược "${id}" phải là một số.`);
    }
    params[key] = param;
  }
  return params;
}

function readMember(value: unknown): CandidateMember {
  if (!isRecord(value)) reject('Một chiến lược trong tổ hợp không đúng định dạng.');
  const { id, version, params, paramsHash, weight } = value;
  if (typeof id !== 'string' || id.length === 0) reject('Một chiến lược trong tổ hợp thiếu mã định danh.');
  if (typeof version !== 'number' || !Number.isInteger(version))
    reject(`Chiến lược "${id}" trong tổ hợp thiếu số phiên bản.`);
  if (typeof paramsHash !== 'string' || paramsHash.length === 0)
    reject(`Chiến lược "${id}" trong tổ hợp thiếu mã băm tham số.`);
  if (!isWeight(weight)) reject(`Trọng số của "${id}" phải từ 10% đến 100%, theo bước 10%.`);
  return { id, version, params: readParams(params, id), paramsHash, weight };
}

/**
 * The check ADR 0007 says has to exist, at the end it says it belongs: the worker, where
 * the untyped value from the queue becomes an object. Anything it rejects is broken in a
 * way a second attempt cannot fix.
 */
export function validateSpec(value: unknown): CandidateSpec {
  if (!isRecord(value)) reject('Công thức tổ hợp không đúng định dạng.');
  const { rule, threshold, members } = value;
  if (!isMergeRule(rule)) reject(`Không nhận ra cách gộp tín hiệu "${String(rule)}".`);
  if (!isThreshold(threshold)) reject('Ngưỡng đồng thuận phải từ 0.1 đến 0.9, theo bước 0.1.');
  if (!Array.isArray(members) || members.length === 0) reject('Tổ hợp chưa có chiến lược nào.');
  const read = members.map(readMember);
  const seen = new Set<string>();
  for (const member of read) {
    const key = memberKey(member);
    if (seen.has(key)) reject(`Chiến lược "${member.id}" v${member.version} bị chọn hai lần.`);
    seen.add(key);
  }
  const total = Number(read.reduce((sum, member) => sum + member.weight, 0).toFixed(6));
  if (total !== 1) reject(`Tổng trọng số đang là ${Math.round(total * 100)}%, phải đúng 100%.`);
  return { rule, threshold, members: read };
}
