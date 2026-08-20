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
import { useTopic } from '../channel/use-topic';

interface CandleChartProps {
  pair: string;
  timeframe: Timeframe;
}

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

/**
 * The candlestick chart T06's "done means" asks for: history on load, then live
 * candles appended through the same channel MarketPanel already uses (ADR 0022/0023).
 */
export function CandleChart({ pair, timeframe }: CandleChartProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  // Only auto-fit the visible range on a chart's first paint — a live candle
  // arriving later must not keep yanking the view back after the user has panned.
  const firstPaintRef = useRef(true);

  const attachChart = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      const chart = createChart(node, {
        autoSize: true,
        layout: { background: { color: 'transparent' }, textColor: token('--ink') },
        grid: {
          vertLines: { color: token('--line') },
          horzLines: { color: token('--line') },
        },
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
      firstPaintRef.current = true;
    } else {
      chartRef.current?.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }
  }, []);

  useEffect(() => {
    setState({ kind: 'loading' });
    const controller = new AbortController();
    fetch(`/api/market/candles?pair=${pair}&timeframe=${timeframe}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((body: { candles: Candle[] }) => setState({ kind: 'ready', candles: body.candles }))
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setState({ kind: 'error', message: e.message });
      });
    return () => controller.abort();
  }, [pair, timeframe, attempt]);

  useEffect(() => {
    if (state.kind !== 'ready' || state.candles.length === 0) return;
    seriesRef.current?.setData(state.candles.map(toBar));
    if (firstPaintRef.current) {
      chartRef.current?.timeScale().fitContent();
      firstPaintRef.current = false;
    }
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
    <section className="panel">
      <div className="panel-head">
        <h2>History — {pair} / {timeframe}</h2>
      </div>

      {state.kind === 'loading' && <p className="state">Loading history…</p>}

      {state.kind === 'error' && (
        <p className="state bad">
          <strong>History unreachable.</strong> {state.message}{' '}
          <button type="button" onClick={() => setAttempt((n) => n + 1)}>
            Retry
          </button>
        </p>
      )}

      {state.kind === 'ready' && state.candles.length === 0 && (
        <p className="state">
          No history yet for <strong>{pair}</strong> on <strong>{timeframe}</strong> — it
          backfills on first watch, and a candle appears here as soon as one closes.
        </p>
      )}

      {hasData && <div ref={attachChart} className="chart" />}
    </section>
  );
}
