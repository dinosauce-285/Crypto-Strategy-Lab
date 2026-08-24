import { useCallback, useEffect, useRef, useState } from 'react';
import type { Candle, Timeframe } from '@csl/contracts';
import {
  CandlestickSeries,
  createChart,
  type IChartApi,
  type UTCTimestamp,
} from 'lightweight-charts';

interface BacktestChartProps {
  pair: string;
  timeframe: Timeframe;
}

// The fixed window each timeframe reads through the range endpoint on mount — no date
// picker yet (that's separate, later work), so this has to be a reasonable default
// rather than "everything," same reasoning as CandleChart's DEFAULT_WINDOW.
const DEFAULT_RANGE_MS: Record<Timeframe, number> = {
  '1m': 2 * 60 * 60 * 1000, // 2 hours
  '5m': 8 * 60 * 60 * 1000, // 8 hours
  '15m': 24 * 60 * 60 * 1000, // 1 day
  '1h': 5 * 24 * 60 * 60 * 1000, // 5 days
  '4h': 15 * 24 * 60 * 60 * 1000, // 15 days
  '1d': 90 * 24 * 60 * 60 * 1000, // 3 months
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

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * The Backtest tab's static chart: one fetch of a fixed window through the range
 * endpoint (ADR 0026), no live subscription. A pair/timeframe never watched on the
 * Realtime tab has nothing backfilled, so the empty state here is the common case, not
 * an edge case.
 */
export function BacktestChart({ pair, timeframe }: BacktestChartProps) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const candlesRef = useRef<Candle[]>([]);
  const chartRef = useRef<IChartApi | null>(null);

  const attachChart = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      chartRef.current?.remove();
      chartRef.current = null;
      return;
    }
    const chart = createChart(node, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: token('--ink') },
      grid: {
        vertLines: { color: token('--line') },
        horzLines: { color: token('--line') },
      },
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
    series.setData(candlesRef.current.map(toBar));
    requestAnimationFrame(() => chart.timeScale().fitContent());
  }, []);

  useEffect(() => {
    setState({ kind: 'loading' });
    candlesRef.current = [];
    const controller = new AbortController();
    const to = Date.now();
    const from = to - DEFAULT_RANGE_MS[timeframe];
    fetch(`/api/market/candles?pair=${pair}&timeframe=${timeframe}&from=${from}&to=${to}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`Lỗi HTTP ${r.status}`))))
      .then((body: { candles: Candle[] }) => {
        candlesRef.current = body.candles;
        setState({ kind: 'ready', candles: body.candles });
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError') return;
        setState({ kind: 'error', message: e.message });
      });
    return () => controller.abort();
  }, [pair, timeframe, attempt]);

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
          Chưa có dữ liệu lịch sử được lưu cho <strong>{pair}</strong> ở{' '}
          <strong>{timeframe}</strong>. Biểu đồ backtest chỉ đọc dữ liệu đã lưu — hãy mở
          cặp này ở tab Realtime trước để nạp dữ liệu.
        </p>
      )}

      {state.kind === 'ready' && state.candles.length > 0 && (
        <div ref={attachChart} className="chart" />
      )}
    </>
  );
}
