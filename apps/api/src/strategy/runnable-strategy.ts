import type { CandidateSpec, DataRequest, Signal, Strategy, StrategyContext, StrategyParams } from '@csl/contracts';

export interface RunnableMember {
  readonly strategy: Strategy;
  readonly params: StrategyParams;
  readonly weight: number;
}

export class WeightedRunnableStrategy {
  readonly warmup: number;

  constructor(
    readonly spec: CandidateSpec,
    private readonly members: readonly RunnableMember[],
  ) {
    this.warmup = Math.max(...members.map((member) => member.strategy.meta.warmup));
  }

  requires(): DataRequest[] {
    const seen = new Set<string>();
    const requests: DataRequest[] = [];
    for (const member of this.members) {
      for (const request of member.strategy.requires(member.params)) {
        const key = requestKey(request);
        if (!seen.has(key)) {
          seen.add(key);
          requests.push(request);
        }
      }
    }
    return requests;
  }

  analyze(context: StrategyContext): Signal {
    const score = roundScore(
      this.members.reduce(
        (sum, member) => sum + directionValue(member.strategy.analyze(context)) * member.weight,
        0,
      ),
    );

    if (score > this.spec.threshold) return { direction: 'BUY', strength: Math.abs(score) };
    if (score < -this.spec.threshold) return { direction: 'SELL', strength: Math.abs(score) };
    return { direction: 'HOLD', strength: Math.abs(score) };
  }
}

function directionValue(signal: Signal): number {
  if (signal.direction === 'BUY') return signal.strength;
  if (signal.direction === 'SELL') return -signal.strength;
  return 0;
}

function requestKey(request: DataRequest): string {
  const sortedParams = Object.keys(request.params)
    .sort()
    .map((key) => [key, request.params[key]]);
  return `${request.source}:${JSON.stringify(sortedParams)}`;
}

function roundScore(score: number): number {
  return Number(score.toFixed(6));
}

