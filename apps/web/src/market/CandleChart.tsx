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
  LineSeries,
  TickMarkType,
  type IChartApi,
  type ISeriesApi,
  type Time,
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

// The library places its own timestamps into the chart as bare UTCTimestamp seconds,
// with no timezone attached — left alone, both the crosshair label and the axis tick
// marks render in UTC, 7 hours behind Vietnam. These formatters convert only at the
// display layer; the timestamps fed to the series above are untouched.
const HCM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const CROSSHAIR_TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  timeZone: HCM_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const AXIS_DATE_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  timeZone: HCM_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
});

const AXIS_TIME_FORMAT = new Intl.DateTimeFormat('vi-VN', {
  timeZone: HCM_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function timeFormatter(time: Time): string {
  return CROSSHAIR_TIME_FORMAT.format(new Date((time as UTCTimestamp) * 1000));
}

function tickMarkFormatter(time: Time, tickMarkType: TickMarkType): string {
  const date = new Date((time as UTCTimestamp) * 1000);
  return tickMarkType <= TickMarkType.DayOfMonth
    ? AXIS_DATE_FORMAT.format(date)
    : AXIS_TIME_FORMAT.format(date);
}

function appendCandle(candles: Candle[], candle: Candle): Candle[] {
  const last = candles[candles.length - 1];
  if (last && last.openTime === candle.openTime) return [...candles.slice(0, -1), candle];
  return [...candles, candle];
}

const MA_PERIOD = 20;

function maBar(candle: Candle, value: number) {
  return { time: Math.floor(candle.openTime / 1000) as UTCTimestamp, value };
}

// A rolling sum over the trailing MA_PERIOD closes, so a MA line point costs O(1) to
// update on a live tick rather than re-averaging up to 1000 historical candles. `window`
// and `sum` track the state the roll needs to keep going; callers seed both from a full
// pass (below) whenever the series is reset, then advance them one candle at a time.
class MARoll {
  private window: number[] = [];
  private sum = 0;

  point(): number | null {
    return this.window.length === MA_PERIOD ? this.sum / MA_PERIOD : null;
  }

  push(close: number): number | null {
    this.window.push(close);
    this.sum += close;
    if (this.window.length > MA_PERIOD) this.sum -= this.window.shift()!;
    return this.point();
  }

  replaceLast(close: number): number | null {
    const i = this.window.length - 1;
    if (i < 0) return null;
    this.sum += close - this.window[i];
    this.window[i] = close;
    return this.point();
  }
}

function computeMA(candles: Candle[]): { roll: MARoll; bars: ReturnType<typeof maBar>[] } {
  const roll = new MARoll();
  const bars: ReturnType<typeof maBar>[] = [];
  for (const candle of candles) {
    const value = roll.push(Number(candle.close));
    if (value !== null) bars.push(maBar(candle, value));
  }
  return { roll, bars };
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
  const maSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  // Mirrors the trailing MA_PERIOD closes behind whatever candlesRef currently holds, so
  // a live tick can advance the average in O(1) instead of recomputing over the full
  // history. Reseeded from scratch (see computeMA) whenever the series resets — first
  // load, a timeframe switch, or a chart remount — since only then is a full pass needed.
  const maRollRef = useRef(new MARoll());
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
      maSeriesRef.current = null;
      return;
    }
    const chart = createChart(node, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: token('--ink') },
      grid: {
        vertLines: { color: token('--line') },
        horzLines: { color: token('--line') },
      },
      localization: { timeFormatter },
      // Off by default in lightweight-charts — without it the axis shows the date
      // only, at every zoom level, even when zoomed into a single hour.
      timeScale: { rightOffset: 4, timeVisible: true, secondsVisible: false, tickMarkFormatter },
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
    const maSeries = chart.addSeries(LineSeries, {
      color: token('--accent'),
      lineWidth: 1,
      title: `MA(${MA_PERIOD})`,
    });
    chartRef.current = chart;
    seriesRef.current = series;
    volumeSeriesRef.current = volumeSeries;
    maSeriesRef.current = maSeries;
    const bars = candlesRef.current.map(toBar);
    series.setData(bars);
    volumeSeries.setData(candlesRef.current.map((c) => toVolumeBar(c, upColor, downColor)));
    const { roll, bars: maBars } = computeMA(candlesRef.current);
    maRollRef.current = roll;
    maSeries.setData(maBars);
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
    const previous = candlesRef.current;
    const next = state.candles;
    candlesRef.current = next;
    seriesRef.current?.setData(next.map(toBar));
    volumeSeriesRef.current?.setData(
      next.map((c) => toVolumeBar(c, token('--ok'), token('--bad'))),
    );

    // appendCandle only ever grows the array by one (a new candle) or replaces its last
    // element (the forming candle's price moved) — see appendCandle above — so those are
    // the only two cases the roll can advance incrementally from. Anything else (first
    // load, a timeframe/pair switch swapping in an unrelated array) needs a fresh pass.
    const isIncremental = previous.length > 0 && previous[0] === next[0];
    const last = next[next.length - 1];
    let value: number | null = null;
    if (isIncremental && next.length === previous.length + 1) {
      value = maRollRef.current.push(Number(last.close));
    } else if (isIncremental && next.length === previous.length) {
      value = maRollRef.current.replaceLast(Number(last.close));
    } else {
      const { roll, bars } = computeMA(next);
      maRollRef.current = roll;
      maSeriesRef.current?.setData(bars);
      return;
    }
    if (value !== null) maSeriesRef.current?.update(maBar(last, value));
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
      {/* index.css is off-limits here (owned by other in-flight cards), so this rides
          inline styles instead of a new class; colors still come from the shared .badge
          classes. Laid out in normal flow (not an absolute overlay) and on purpose: an
          overlay collided with the chart's own price-scale labels when a chart was
          showing, and with the loading/error text and chart-label's timeframe pill when
          it wasn't. A real flow row, right-aligned, sits clear of both in every state. */}
      {/* marginTop lines this up with chart-label's (Dashboard.tsx, index.css) top:0.5rem
          absolute offset — chart-label has less padding than .badge, so flush-top made
          the two rows read as visibly misaligned. */}
      <div style={{ textAlign: 'right', marginTop: '0.45rem', marginBottom: '0.5rem' }}>
        <span className={`badge ${badge.className}`}>{badge.text}</span>
      </div>

      {state.kind === 'loading' && <p className="state">Đang tải dữ liệu lịch sử…</p>}

      {state.kind === 'error' && (
        <p className="state bad">
          <strong>Không tải được dữ liệu lịch sử.</strong> {state.message}{' '}
          <button type="button" className="btn-action" onClick={() => setAttempt((n) => n + 1)}>
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
        // chart-stale-banner is an absolute overlay (index.css, unmodified) meant to sit
        // right at the top of the chart below — pushed down to clear the badge row above,
        // which takes real layout space now and would otherwise sit right underneath it.
        <p className="chart-stale-banner state bad" style={{ top: '2.1rem' }}>
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
