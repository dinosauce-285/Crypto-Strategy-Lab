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
  // Only exists to force a re-render every second so latency keeps ticking up between
  // messages — the value itself is never read. Reading a `now` *state* instead (set once
  // a second) was the bug: a message can arrive mid-second and re-render with a fresh
  // lastUpdatedAt against a now up to 999ms stale, going negative and clamping to 0ms.
  // Date.now() below is always current regardless of which render triggered it.
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
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
        <dd>{lastUpdatedAt ? latency(Date.now() - lastUpdatedAt) : '—'}</dd>
      </dl>
    </section>
  );
}
