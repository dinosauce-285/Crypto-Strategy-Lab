import type { CandidateSpec } from './candidate';
import type { Metrics } from './experiment';
import type { Candle } from './market';
import type { Sentiment } from './news';

/**
 * The nine events from section 34 of the brief.
 *
 * Publishers and subscribers agree on these names and nothing else — that is what
 * keeps the backtest worker from holding a reference to the leaderboard.
 */
export const EVENTS = {
  MarketPriceUpdated: 'market.price.updated',
  CandleClosed: 'market.candle.closed',
  StrategyGenerated: 'strategy.generated',
  BacktestStarted: 'backtest.started',
  BacktestCompleted: 'backtest.completed',
  StrategyEvaluated: 'strategy.evaluated',
  LeaderboardUpdated: 'leaderboard.updated',
  NewsCollected: 'news.collected',
  SentimentAnalyzed: 'news.sentiment.analyzed',
} as const;

export type EventName = (typeof EVENTS)[keyof typeof EVENTS];

/**
 * These travel on the in-process bus, which is not the channel the browser listens
 * to — a socket message is shaped for a screen, an event is shaped for a module.
 *
 * A payload carries identifiers rather than the thing itself wherever the receiver
 * can read it: `LeaderboardUpdated` says which board moved, not what the board now
 * holds, because the ranking is recomputed on read and would be stale by arrival.
 */
export type EventPayloads = {
  [EVENTS.MarketPriceUpdated]: { pair: string; price: string; at: number };
  [EVENTS.CandleClosed]: { candle: Candle };
  [EVENTS.StrategyGenerated]: {
    spec: CandidateSpec;
    specHash: string;
    datasetId: string;
  };
  [EVENTS.BacktestStarted]: { specHash: string; datasetId: string };
  [EVENTS.BacktestCompleted]: {
    experimentId: string;
    datasetId: string;
    tradeCount: number;
  };
  [EVENTS.StrategyEvaluated]: {
    experimentId: string;
    datasetId: string;
    metrics: Metrics;
  };
  [EVENTS.LeaderboardUpdated]: { datasetId: string };
  [EVENTS.NewsCollected]: { newsIds: string[]; source: string };
  [EVENTS.SentimentAnalyzed]: { newsId: string; sentiment: Sentiment };
};

export type EventPayload<N extends EventName> = EventPayloads[N];
