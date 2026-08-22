import { Injectable } from '@nestjs/common';
import type { Sentiment, SentimentLabel } from '@csl/contracts';
import { SentimentProviderPort } from '../ports/sentiment-provider.port';

const POSITIVE_KEYWORDS: readonly string[] = [
  'all-time high',
  'record high',
  'bullish',
  'surge',
  'surges',
  'surged',
  'surging',
  'rally',
  'rallies',
  'rallied',
  'rallying',
  'soar',
  'soars',
  'soared',
  'soaring',
  'jump',
  'jumps',
  'jumped',
  'gain',
  'gains',
  'gained',
  'breakout',
  'profit',
  'profits',
  'growth',
  'upward',
  'green',
  'pump',
  'moon',
  'adopt',
  'adoption',
  'partnership',
  'approve',
  'approved',
  'approval',
  'upgrade',
  'success',
  'successful',
  'boom',
  'accumulate',
  'accumulation',
  'inflow',
  'inflows',
  'buying',
  'bull',
  'bulls',
  'optimism',
  'optimistic',
  'boost',
  'outperform',
  'high',
];

const NEGATIVE_KEYWORDS: readonly string[] = [
  'all-time low',
  'bearish',
  'crash',
  'crashes',
  'crashed',
  'crashing',
  'plunge',
  'plunges',
  'plunged',
  'plunging',
  'drop',
  'drops',
  'dropped',
  'dropping',
  'fall',
  'falls',
  'fell',
  'falling',
  'decline',
  'declines',
  'declined',
  'sink',
  'sinks',
  'loss',
  'losses',
  'selloff',
  'sell-off',
  'dump',
  'dumping',
  'collapse',
  'collapsed',
  'scam',
  'hack',
  'hacked',
  'hacks',
  'exploit',
  'exploited',
  'ban',
  'banned',
  'bans',
  'crackdown',
  'lawsuit',
  'fraud',
  'red',
  'fear',
  'panic',
  'liquidation',
  'liquidated',
  'outflow',
  'outflows',
  'plummet',
  'plummeted',
  'slump',
  'slumps',
  'warning',
  'warns',
  'vulnerability',
  'struggle',
  'struggles',
];

@Injectable()
export class HeuristicSentimentProvider extends SentimentProviderPort {
  readonly name = 'Heuristic';

  async analyze(text: string): Promise<Sentiment> {
    const trimmed = text.trim();
    if (!trimmed) {
      return { label: 'NEUTRAL', score: 0.0 };
    }

    const lower = trimmed.toLowerCase();

    let posCount = 0;
    for (const kw of POSITIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${kw.replace('-', '[- ]')}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        posCount += matches.length;
      }
    }

    let negCount = 0;
    for (const kw of NEGATIVE_KEYWORDS) {
      const regex = new RegExp(`\\b${kw.replace('-', '[- ]')}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) {
        negCount += matches.length;
      }
    }

    const total = posCount + negCount;
    if (total === 0) {
      return { label: 'NEUTRAL', score: 0.0 };
    }

    const rawScore = (posCount - negCount) / total;
    const clampedScore = Math.max(-1.0, Math.min(1.0, rawScore));
    const score = Math.round(clampedScore * 100) / 100;

    let label: SentimentLabel;
    if (score > 0.05) {
      label = 'POSITIVE';
    } else if (score < -0.05) {
      label = 'NEGATIVE';
    } else {
      label = 'NEUTRAL';
    }

    return { label, score };
  }
}
