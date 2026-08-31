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
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from 'lightweight-charts';
import { apiFetch } from '../api/request';
import { useTopic } from '../channel/use-topic';

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

function toBar(candle: Candle) {
  return {
    time: Math.floor(candle.openTime / 1000) as UTCTimestamp,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
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
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
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
    const series = chart.addSeries(CandlestickSeries, {
      upColor: token('--ok'),
      downColor: token('--bad'),
      borderUpColor: token('--ok'),
      borderDownColor: token('--bad'),
      wickUpColor: token('--ok'),
      wickDownColor: token('--bad'),
    });
    chartRef.current = chart;
    seriesRef.current = series;
    const bars = candlesRef.current.map(toBar);
    series.setData(bars);
    // A chart created inside a CSS grid cell can still be mid-layout (grid track
    // widths not yet resolved) at this instant — setting the range against a stale
    // width can render oddly. One frame is enough for layout to settle.
    requestAnimationFrame(() => showDefaultWindow(chart, bars, DEFAULT_WINDOW[timeframe]));
  }, [timeframe]);

  useEffect(() => {
    setState({ kind: 'loading' });
    candlesRef.current = [];
    const controller = new AbortController();
    apiFetch<{ candles: Candle[] }>(`/api/market/candles?pair=${pair}&timeframe=${timeframe}`, {
      signal: controller.signal,
    })
      .then((body) => setState({ kind: 'ready', candles: body.candles }))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setState({ kind: 'error', message: e.message });
      });
    return () => controller.abort();
  }, [pair, timeframe, attempt]);

  useEffect(() => {
    if (state.kind !== 'ready' || state.candles.length === 0) return;
    candlesRef.current = state.candles;
    seriesRef.current?.setData(state.candles.map(toBar));
  }, [state]);

  useTopic(
    marketCandleTopic(pair, timeframe),
    useCallback((message: ServerMessage) => {
      if (message.type !== MESSAGES.MarketCandle) return;
      setState((prev) => ({
        kind: 'ready',
        candles: appendCandle(prev.kind === 'ready' ? prev.candles : [], message.payload.candle),
      }));
    }, []),
  );

  const hasData = state.kind === 'ready' && state.candles.length > 0;

  return (
    <>
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

      {hasData && <div ref={attachChart} className="chart" />}
    </>
  );
}
