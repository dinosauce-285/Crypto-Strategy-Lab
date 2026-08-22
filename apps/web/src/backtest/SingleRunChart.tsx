import { useCallback, useEffect, useRef } from 'react';
import type { Candle, Trade } from '@csl/contracts';
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';

interface TradeWithSeq extends Trade {
  seq: number;
}

interface SingleRunChartProps {
  candles: Candle[];
  trades: TradeWithSeq[];
  indicators?: Record<string, number[]>;
  selectedTrade: TradeWithSeq | null;
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

function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function SingleRunChart({
  candles,
  trades,
  indicators,
  selectedTrade,
}: SingleRunChartProps) {
  const chartContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const mainSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const initChart = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      chartRef.current?.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      markersPluginRef.current = null;
      return;
    }

    const chart = createChart(node, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: token('--ink') },
      grid: {
        vertLines: { color: token('--line') },
        horzLines: { color: token('--line') },
      },
      timeScale: { rightOffset: 6, timeVisible: true, secondsVisible: false },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: token('--ok'),
      downColor: token('--bad'),
      borderUpColor: token('--ok'),
      borderDownColor: token('--bad'),
      wickUpColor: token('--ok'),
      wickDownColor: token('--bad'),
    });

    chartRef.current = chart;
    mainSeriesRef.current = candleSeries;
    chartContainerRef.current = node;

    // Set candle bars
    if (candles.length > 0) {
      candleSeries.setData(candles.map(toBar));
      chart.timeScale().fitContent();
    }
  }, [candles]);

  // Update chart data, indicators, and trade markers whenever inputs change
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = mainSeriesRef.current;
    if (!chart || !candleSeries || candles.length === 0) return;

    candleSeries.setData(candles.map(toBar));

    // 1. Add indicator overlays if present
    if (indicators) {
      if (indicators['ma.20'] && indicators['ma.20'].length === candles.length) {
        const maSeries = chart.addSeries(LineSeries, {
          color: token('--accent'),
          lineWidth: 1,
          title: 'MA(20)',
        });
        const maData = candles.map((c, i) => ({
          time: Math.floor(c.openTime / 1000) as UTCTimestamp,
          value: indicators['ma.20'][i],
        })).filter((d) => !Number.isNaN(d.value) && d.value > 0);
        maSeries.setData(maData);
      }

      if (indicators['bb.upper'] && indicators['bb.lower']) {
        const bbUpper = chart.addSeries(LineSeries, {
          color: token('--muted'),
          lineWidth: 1,
          lineStyle: 2,
          title: 'BB Upper',
        });
        const bbLower = chart.addSeries(LineSeries, {
          color: token('--muted'),
          lineWidth: 1,
          lineStyle: 2,
          title: 'BB Lower',
        });

        bbUpper.setData(
          candles.map((c, i) => ({
            time: Math.floor(c.openTime / 1000) as UTCTimestamp,
            value: indicators['bb.upper'][i],
          })).filter((d) => !Number.isNaN(d.value) && d.value > 0),
        );
        bbLower.setData(
          candles.map((c, i) => ({
            time: Math.floor(c.openTime / 1000) as UTCTimestamp,
            value: indicators['bb.lower'][i],
          })).filter((d) => !Number.isNaN(d.value) && d.value > 0),
        );
      }
    }

    // 2. Build trade markers
    const markers: SeriesMarker<Time>[] = [];
    for (const trade of trades) {
      const entryTime = Math.floor(trade.entryTime / 1000) as UTCTimestamp;
      const exitTime = Math.floor(trade.exitTime / 1000) as UTCTimestamp;
      const isHighlighted = selectedTrade?.seq === trade.seq;

      // Entry marker
      markers.push({
        time: entryTime,
        position: trade.side === 'BUY' ? 'belowBar' : 'aboveBar',
        color: isHighlighted ? token('--accent') : trade.side === 'BUY' ? token('--ok') : token('--bad'),
        shape: trade.side === 'BUY' ? 'arrowUp' : 'arrowDown',
        text: `${trade.side} #${trade.seq}`,
        size: isHighlighted ? 2 : 1,
      });

      // Exit marker
      markers.push({
        time: exitTime,
        position: trade.side === 'BUY' ? 'aboveBar' : 'belowBar',
        color: isHighlighted ? token('--accent') : token('--muted'),
        shape: isHighlighted ? 'circle' : 'square',
        text: `Exit #${trade.seq}`,
        size: isHighlighted ? 2 : 1,
      });
    }

    // Sort markers chronologically
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    if (markersPluginRef.current) {
      markersPluginRef.current.setMarkers(markers);
    } else {
      markersPluginRef.current = createSeriesMarkers(candleSeries, markers);
    }
  }, [candles, trades, indicators, selectedTrade]);

  // Focus and center chart when a trade is selected
  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !selectedTrade) return;

    const fromTime = (Math.floor(selectedTrade.entryTime / 1000) - 3600 * 2) as UTCTimestamp;
    const toTime = (Math.floor(selectedTrade.exitTime / 1000) + 3600 * 2) as UTCTimestamp;

    try {
      chart.timeScale().setVisibleRange({ from: fromTime, to: toTime });
    } catch {
      // Ignore if range out of bounds
    }
  }, [selectedTrade]);

  return <div ref={initChart} className="chart" style={{ height: '360px' }} />;
}
