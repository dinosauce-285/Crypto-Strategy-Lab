/**
 * The nine events from section 34 of the brief.
 *
 * Publishers and subscribers agree on these names and nothing else — that is what
 * keeps the backtest worker from holding a reference to the leaderboard. Payload
 * shapes are filled in by T02 as each producer is built; the names are fixed here
 * so nobody invents a second spelling.
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
