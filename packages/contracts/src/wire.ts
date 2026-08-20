import type { Candle, Timeframe } from './market';
import { TIMEFRAMES } from './market';
import type { RunStatus } from './search';

/**
 * The push channel to the browser (ADR 0017, 0019). Not the event bus of `events.ts`:
 * these are shaped for a screen, those are shaped for a module.
 *
 * Every message is a `type` and a `payload` and nothing else, so a reader knows where
 * to look before it knows what it is looking at.
 */
export type ServerMessage = {
  [T in MessageType]: { type: T; payload: MessagePayloads[T] };
}[MessageType];

export const MESSAGES = {
  MarketPrice: 'market.price',
  MarketCandle: 'market.candle',
  SearchProgress: 'search.progress',
} as const;

export type MessageType = (typeof MESSAGES)[keyof typeof MESSAGES];

export type MessagePayloads = {
  [MESSAGES.MarketPrice]: { pair: string; price: string; at: number };
  [MESSAGES.MarketCandle]: { candle: Candle };
  [MESSAGES.SearchProgress]: { status: RunStatus };
};

/**
 * The transport-level names both sides agree on. The path is ours rather than the
 * library's default, so what the browser connects to is declared here instead of
 * being inherited from a dependency.
 *
 * A message arrives under its own topic, so a client watching four topics is woken by
 * the one that moved. Topics carry a colon and never collide with these three names.
 */
export const CHANNEL = {
  path: '/channel',
  subscribe: 'subscribe',
  unsubscribe: 'unsubscribe',
} as const;

/**
 * A topic is an opaque string to the server. These builders exist so a client never
 * writes one by hand — `0017` accepts that a mistyped topic is silent, and this is the
 * narrowing it names.
 */
export const marketPriceTopic = (pair: string): string => `market:${pair}:price`;

export const marketCandleTopic = (pair: string, timeframe: Timeframe): string =>
  `market:${pair}:${timeframe}`;

/** A run publishes under a topic of its own, so watching one run is not watching all of them. */
export const searchRunTopic = (runId: string): string => `search:${runId}`;

export type MarketTopic =
  | { pair: string; kind: 'price' }
  | { pair: string; kind: 'candle'; timeframe: Timeframe };

export function parseMarketTopic(topic: string): MarketTopic | null {
  const [namespace, pair, tail] = topic.split(':');
  if (namespace !== 'market' || !pair || !tail) return null;
  if (tail === 'price') return { pair, kind: 'price' };
  const timeframe = TIMEFRAMES.find((t) => t === tail);
  return timeframe ? { pair, kind: 'candle', timeframe } : null;
}
