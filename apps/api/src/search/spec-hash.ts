import { createHash } from 'node:crypto';
import { canonicalSpec, type CandidateSpec } from '@csl/contracts';

export const specHash = (spec: CandidateSpec): string =>
  createHash('sha256').update(canonicalSpec(spec)).digest('hex');
