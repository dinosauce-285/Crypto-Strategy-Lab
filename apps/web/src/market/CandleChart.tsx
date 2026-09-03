import { useCallback, useEffect, useRef, useState } from 'react';
import {
  MESSAGES,
  marketCandleTopic,
  type Candle,
  type ServerMessage,
  type Timeframe,
} from '@csl/contracts';
import {
  CandlestickSeries,
  createChart,
  HistogramSeries,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { apiFetch } from '../api/request';
import { useChannelStatus, useTopic, type ChannelStatus } from '../channel/use-topic';
import { clock } from './format';

interface CandleChartProps {
  pair: string;
  timeframe: Timeframe;
}

// How many of the most recent candles a chart opens showing, chosen per timeframe so
// each one defaults to a span that's actually useful at that granularity — recent hours
// for 1m/5m, days for 15m/1h, weeks/months for 4h/1d — rather than fitting all 1000
// backfilled candles, which zooms out to years for the daily chart.
const DEFAULT_WINDOW: Record<Timeframe, number> = {
  '1m': 120, // ~2 hours
  '5m': 96, // ~8 hours
  '15m': 96, // ~1 day
  '30m': 96, // ~2 days
  '1h': 120, // ~5 days
  '2h': 120, // ~10 days
  '4h': 90, // ~15 days
  '1d': 90, // ~3 months
};

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; candles: Candle[] };

// A small always-on badge per T33, distinct from the `isStale` banner below (which only
// appears once the channel has actually been down long enough to matter). The badge
// answers "is this chart live right now"; the banner answers "how long has it been dead."
const CHANNEL_BADGE: Record<ChannelStatus, { text: string; className: string }> = {
  live: { text: '● Đang nhận dữ liệu', className: 'badge-pos' },
  connecting: { text: 'Đang kết nối…', className: 'badge-neu' },
  down: { text: 'Mất kết nối', className: 'badge-neg' },
};

// Dev-mode StrictMode mounts every effect twice (mount, cleanup, remount) as a safety
// check. Without this cache each mount would fire its own history fetch, and the first
// one's cleanup would abort mid-flight — four ERR_ABORTED requests every time the
// Realtime screen opens (one per timeframe). Keying by URL lets the second mount reuse
// the first mount's in-flight request instead of starting a new one.
const inFlightHistory = new Map<string, Promise<{ candles: Candle[] }>>();

function fetchHistory(url: string): Promise<{ candles: Candle[] }> {
  const pending = inFlightHistory.get(url);
  if (pending) return pending;
  const request = apiFetch<{ candles: Candle[] }>(url).finally(() => inFlightHistory.delete(url));
  inFlightHistory.set(url, request);
  return request;
}

function toBar(candle: Candle) {
  return {
    time: Math.floor(candle.openTime / 1000) as UTCTimestamp,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

function toVolumeBar(candle: Candle, upColor: string, downColor: string) {
  return {
    time: Math.floor(candle.openTime / 1000) as UTCTimestamp,
    value: Number(candle.volume),
    color: Number(candle.close) >= Number(candle.open) ? upColor : downColor,
  };
}

function appendCandle(candles: Candle[], candle: Candle): Candle[] {
  const last = candles[candles.length - 1];
  if (last && last.openTime === candle.openTime) return [...candles.slice(0, -1), candle];
  return [...candles, candle];
}

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function showDefaultWindow(chart: IChartApi, bars: ReturnType<typeof toBar>[], windowSize: number) {
  if (bars.length === 0) return;
  const start = Math.max(0, bars.length - windowSize);
  chart.timeScale().setVisibleRange({ from: bars[start].time, to: bars[bars.length - 1].time });
}

/**
 * The candlestick chart T06's "done means" asks for: history on load, then live
 * candles appended through the same push channel `RecentTicks` uses (ADR 0022/0023).
 */
export function CandleChart({ pair, timeframe }: CandleChartProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const channelStatus = useChannelStatus();
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // The chart div only mounts once there's data to show (see `hasData` below), and in
  // dev-mode StrictMode a freshly-mounted node is destroyed and recreated once as a
  // safety check — which can happen *after* the data already arrived. So the latest
  // known candles live here, and attachChart paints from it directly on every chart
  // creation, not just the one the fetch effect happened to catch.
  const candlesRef = useRef<Candle[]>([]);

  const attachChart = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeSeriesRef.current = null;
      return;
    }
    const chart = createChart(node, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: token('--ink') },
      grid: {
        vertLines: { color: token('--line') },
        horzLines: { color: token('--line') },
      },
      // Off by default in lightweight-charts — without it the axis shows the date
      // only, at every zoom level, even when zoomed into a single hour.
      timeScale: { rightOffset: 4, timeVisible: true, secondsVisible: false },
    });
    const upColor = token('--ok');
    const downColor = token('--bad');
    const series = chart.addSeries(CandlestickSeries, {
      upColor,
      downColor,
      borderUpColor: upColor,
      borderDownColor: downColor,
      wickUpColor: upColor,
      wickDownColor: downColor,
    });
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    // Confines the volume histogram to the bottom 20% of the pane instead of sharing
    // the candlesticks' own scale, so bars read as a strip under the price action
    // rather than overlapping it.
    volumeSeries.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;
    const bars = candlesRef.current.map(toBar);
    series.setData(bars);
    volumeSeries.setData(candlesRef.current.map((c) => toVolumeBar(c, upColor, downColor)));
    // A chart created inside a CSS grid cell can still be mid-layout (grid track
    // widths not yet resolved) at this instant — setting the range against a stale
    // width can render oddly. One frame is enough for layout to settle.
    requestAnimationFrame(() => showDefaultWindow(chart, bars, DEFAULT_WINDOW[timeframe]));
  }, [timeframe]);

  useEffect(() => {
    setState({ kind: 'loading' });
    candlesRef.current = [];
    let cancelled = false;
    fetchHistory(`/api/market/candles?pair=${pair}&timeframe=${timeframe}`)
      .then((body) => {
        if (cancelled) return;
        setState({ kind: 'ready', candles: body.candles });
        if (body.candles.length > 0) setLastUpdatedAt(Date.now());
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setState({ kind: 'error', message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [pair, timeframe, attempt]);

  useEffect(() => {
    if (state.kind !== 'ready' || state.candles.length === 0) return;
    candlesRef.current = state.candles;
    seriesRef.current?.setData(state.candles.map(toBar));
    volumeSeriesRef.current?.setData(
      state.candles.map((c) => toVolumeBar(c, token('--ok'), token('--bad'))),
    );
  }, [state]);

  useTopic(
    marketCandleTopic(pair, timeframe),
    useCallback((message: ServerMessage) => {
      if (message.type !== MESSAGES.MarketCandle) return;
      setState((prev) => ({
        kind: 'ready',
        candles: appendCandle(prev.kind === 'ready' ? prev.candles : [], message.payload.candle),
      }));
      setLastUpdatedAt(Date.now());
    }, []),
  );

  const hasData = state.kind === 'ready' && state.candles.length > 0;
  const isStale = hasData && channelStatus === 'down';

  const badge = CHANNEL_BADGE[channelStatus];

  return (
    <>
      {/* index.css is off-limits here (owned by other in-flight cards), so positioning
          rides inline styles instead of a new class; colors still come from the shared
          .badge classes. Sits opposite chart-label's top-left corner. */}
      <span
        className={`badge ${badge.className}`}
        style={{ position: 'absolute', top: '0.5rem', right: '0.6rem', zIndex: 1 }}
      >
        {badge.text}
      </span>

      {state.kind === 'loading' && <p className="state">Đang tải dữ liệu lịch sử…</p>}

      {state.kind === 'error' && (
        <p className="state bad">
          <strong>Không tải được dữ liệu lịch sử.</strong> {state.message}{' '}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Thử lại
          </button>
        </p>
      )}

      {state.kind === 'ready' && state.candles.length === 0 && (
        <p className="state">
          Chưa có dữ liệu lịch sử cho <strong>{pair}</strong> ở <strong>{timeframe}</strong>{' '}
          — dữ liệu sẽ được nạp khi bắt đầu theo dõi, và nến sẽ xuất hiện ngay khi đóng.
        </p>
      )}

      {isStale && (
        // Shifted below the badge row above (top: 0.5rem) so the two don't overlap.
        <p className="chart-stale-banner state bad" style={{ top: '1.7rem' }}>
          <strong>Mất kết nối kênh.</strong> Dữ liệu đứng yên từ{' '}
          {lastUpdatedAt ? clock(lastUpdatedAt) : '—'}.
        </p>
      )}

      {hasData && (
        <div ref={attachChart} className={isStale ? 'chart chart-stale' : 'chart'} />
      )}
    </>
  );
}
