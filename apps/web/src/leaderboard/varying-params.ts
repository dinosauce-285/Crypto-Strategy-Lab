import type { LeaderboardEntry, StrategyParams } from '@csl/contracts';
import { formatParam } from '../backtest/param-labels';

/**
 * Parameter names that actually differ between the ranked candidates, per strategy.
 * Two candidates built from the same strategies and separated only by a period read as
 * the same row otherwise, so only the names found here are worth the space.
 */
export function varyingParamNames(entries: LeaderboardEntry[]): Map<string, Set<string>> {
  const values = new Map<string, Map<string, Set<number>>>();

  for (const entry of entries) {
    for (const member of entry.spec.members) {
      let perStrategy = values.get(member.id);
      if (!perStrategy) {
        perStrategy = new Map();
        values.set(member.id, perStrategy);
      }
      for (const [name, value] of Object.entries(member.params)) {
        let seen = perStrategy.get(name);
        if (!seen) {
          seen = new Set();
          perStrategy.set(name, seen);
        }
        seen.add(value);
      }
    }
  }

  const varying = new Map<string, Set<string>>();
  for (const [id, perStrategy] of values) {
    const names = new Set<string>();
    for (const [name, seen] of perStrategy) {
      if (seen.size > 1) names.add(name);
    }
    if (names.size > 0) varying.set(id, names);
  }
  return varying;
}

export function varyingParamText(params: StrategyParams, names: Set<string> | undefined): string {
  if (!names) return '';
  return Object.entries(params)
    .filter(([name]) => names.has(name))
    .map(([name, value]) => formatParam(name, value))
    .join(', ');
}
