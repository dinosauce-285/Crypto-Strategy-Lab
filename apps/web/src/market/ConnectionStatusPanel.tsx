import { useEffect, useState } from 'react';
import { useChannelStatus, useLastUpdatedAt, type ChannelStatus } from '../channel/use-topic';
import { clock, latency } from './format';

const STATUS_LABEL: Record<ChannelStatus, { text: string; className: string }> = {
  live: { text: 'Đã kết nối', className: 'badge-pos' },
  connecting: { text: 'Đang kết nối…', className: 'badge-neu' },
  down: { text: 'Mất kết nối', className: 'badge-neg' },
};

/**
 * Shared across all 4 CandleChart cards (T35) — one connection story for the whole
 * screen, rather than each card repeating it. "Độ trễ" isn't a real ping: per the
 * 2026-09-03 decision on the card, it's just time-since-last-message, computed
 * client-side from `lastUpdatedAt`.
 */
export function ConnectionStatusPanel() {
  const status = useChannelStatus();
  const lastUpdatedAt = useLastUpdatedAt();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const label = STATUS_LABEL[status];

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Trạng thái kết nối</h2>
        <span className={`badge ${label.className}`}>{label.text}</span>
      </div>

      <dl>
        <dt>Nguồn dữ liệu</dt>
        <dd>Binance API + WebSocket</dd>

        <dt>Dữ liệu cuối</dt>
        <dd>{lastUpdatedAt ? clock(lastUpdatedAt) : '—'}</dd>

        <dt>Độ trễ</dt>
        <dd>{lastUpdatedAt ? latency(now - lastUpdatedAt) : '—'}</dd>
      </dl>
    </section>
  );
}
