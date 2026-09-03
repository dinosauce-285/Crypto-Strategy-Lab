import { useEffect, useRef, useState } from 'react';
import { CHANNEL, type ServerMessage } from '@csl/contracts';
import { channel } from './channel';

export type ChannelStatus = 'connecting' | 'live' | 'down';

export function useChannelStatus(): ChannelStatus {
  const [status, setStatus] = useState<ChannelStatus>(() =>
    channel().connected ? 'live' : 'connecting',
  );

  useEffect(() => {
    const socket = channel();
    const live = () => setStatus('live');
    const down = () => setStatus('down');

    socket.on('connect', live);
    socket.on('disconnect', down);
    socket.on('connect_error', down);
    return () => {
      socket.off('connect', live);
      socket.off('disconnect', down);
      socket.off('connect_error', down);
    };
  }, []);

  return status;
}

// Fires on every message the socket receives, regardless of topic — a proxy for "the
// channel is actively delivering data" that a status panel can show without knowing
// about any particular chart's candles. socket.io's reserved lifecycle events (connect,
// disconnect, ...) aren't routed through onAny, so this only reflects server messages.
export function useLastUpdatedAt(): number | null {
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    const socket = channel();
    const mark = () => setLastUpdatedAt(Date.now());
    socket.onAny(mark);
    return () => {
      socket.offAny(mark);
    };
  }, []);

  return lastUpdatedAt;
}

export function useTopic(
  topic: string | null,
  onMessage: (message: ServerMessage) => void,
): void {
  const handler = useRef(onMessage);
  handler.current = onMessage;

  useEffect(() => {
    if (!topic) return;
    const socket = channel();
    const deliver = (message: ServerMessage) => handler.current(message);
    // A reconnected client holds nothing on the server, so the subscription is sent again.
    const subscribe = () => socket.emit(CHANNEL.subscribe, topic);

    socket.on(topic, deliver);
    socket.on('connect', subscribe);
    if (socket.connected) subscribe();

    return () => {
      socket.emit(CHANNEL.unsubscribe, topic);
      socket.off(topic, deliver);
      socket.off('connect', subscribe);
    };
  }, [topic]);
}
