import { useChannelStatus, type ChannelStatus } from '../channel/use-topic';

const LABEL: Record<ChannelStatus, string> = {
  live: 'Trực tiếp',
  connecting: 'Đang kết nối…',
  down: 'Mất kết nối',
};

/**
 * The whole app's connection in one line, always on screen. The Realtime screen's
 * `ConnectionStatusPanel` tells the longer story (source, last message, latency); this
 * only answers whether anything at all is arriving, on every screen.
 */
export function ChannelStatusPill() {
  const status = useChannelStatus();

  return (
    <span className="link-status" data-state={status} role="status">
      <span className="link-dot" />
      {LABEL[status]}
    </span>
  );
}
