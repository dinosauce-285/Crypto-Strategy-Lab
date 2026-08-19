import type { ServerMessage } from '@csl/contracts';

/**
 * How a module reaches the browser (ADR 0020). A topic is an opaque string here —
 * the channel matches it and never interprets it.
 */
export abstract class ChannelPublisher {
  abstract publish(topic: string, message: ServerMessage): void;
}
