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
