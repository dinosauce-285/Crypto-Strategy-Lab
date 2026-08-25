import { useCallback, useEffect, useRef } from 'react';
import type { Candle, Trade } from '@csl/contracts';
import {
  CandlestickSeries,
  createChart,
  createSeriesMarkers,
  HistogramSeries,
  LineSeries,
  type IChartApi,
  type ISeriesApi,
  type ISeriesMarkersPluginApi,
  type SeriesMarker,
  type Time,
  type UTCTimestamp,
} from 'lightweight-charts';
import { sideLabel } from '../market/format';

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

function toVolumeBar(candle: Candle, upColor: string, downColor: string) {
  return {
    time: Math.floor(candle.openTime / 1000) as UTCTimestamp,
    value: Number(candle.volume),
    color: Number(candle.close) >= Number(candle.open) ? upColor : downColor,
  };
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
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);

  const indicatorSeriesRef = useRef<ISeriesApi<'Line'>[]>([]);

  const initChart = useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      chartRef.current?.remove();
      chartRef.current = null;
      mainSeriesRef.current = null;
      volumeSeriesRef.current = null;
      markersPluginRef.current = null;
      indicatorSeriesRef.current = [];
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

    const upColor = token('--ok');
    const downColor = token('--bad');
    const candleSeries = chart.addSeries(CandlestickSeries, {
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
    mainSeriesRef.current = candleSeries;
    volumeSeriesRef.current = volumeSeries;
    chartContainerRef.current = node;

    // Set candle bars
    if (candles.length > 0) {
      candleSeries.setData(candles.map(toBar));
      volumeSeries.setData(candles.map((c) => toVolumeBar(c, upColor, downColor)));
      chart.timeScale().fitContent();
    }
  }, [candles]);

  // Update chart data, indicators, and trade markers whenever inputs change
  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = mainSeriesRef.current;
    if (!chart || !candleSeries || candles.length === 0) return;

    candleSeries.setData(candles.map(toBar));
    volumeSeriesRef.current?.setData(
      candles.map((c) => toVolumeBar(c, token('--ok'), token('--bad'))),
    );

    // Clear previous indicator series
    indicatorSeriesRef.current.forEach((s) => {
      try {
        chart.removeSeries(s);
      } catch {
        // Safe fallback
      }
    });
    indicatorSeriesRef.current = [];

    // 1. Add indicator overlays if present
    if (indicators) {
      if (indicators['ma.fast'] && indicators['ma.fast'].length === candles.length) {
        const maFastSeries = chart.addSeries(LineSeries, {
          color: token('--accent'),
          lineWidth: 1,
          title: 'MA Fast',
        });
        const maFastData = candles.map((c, i) => ({
          time: Math.floor(c.openTime / 1000) as UTCTimestamp,
          value: indicators['ma.fast'][i],
        })).filter((d) => !Number.isNaN(d.value) && d.value > 0);
        maFastSeries.setData(maFastData);
        indicatorSeriesRef.current.push(maFastSeries);
      }

      if (indicators['ma.slow'] && indicators['ma.slow'].length === candles.length) {
        const maSlowSeries = chart.addSeries(LineSeries, {
          color: token('--muted'),
          lineWidth: 1,
          lineStyle: 2,
          title: 'MA Slow',
        });
        const maSlowData = candles.map((c, i) => ({
          time: Math.floor(c.openTime / 1000) as UTCTimestamp,
          value: indicators['ma.slow'][i],
        })).filter((d) => !Number.isNaN(d.value) && d.value > 0);
        maSlowSeries.setData(maSlowData);
        indicatorSeriesRef.current.push(maSlowSeries);
      } else if (!indicators['ma.fast'] && indicators['ma.20'] && indicators['ma.20'].length === candles.length) {
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
        indicatorSeriesRef.current.push(maSeries);
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
        indicatorSeriesRef.current.push(bbUpper, bbLower);
      }

      if (indicators['sr.support']) {
        const srSupport = chart.addSeries(LineSeries, {
          color: token('--ok'),
          lineWidth: 1,
          lineStyle: 1,
          title: 'Support',
        });
        srSupport.setData(
          candles.map((c, i) => ({
            time: Math.floor(c.openTime / 1000) as UTCTimestamp,
            value: indicators['sr.support'][i],
          })).filter((d) => !Number.isNaN(d.value) && d.value > 0),
        );
        indicatorSeriesRef.current.push(srSupport);
      }

      if (indicators['sr.resistance']) {
        const srResistance = chart.addSeries(LineSeries, {
          color: token('--bad'),
          lineWidth: 1,
          lineStyle: 1,
          title: 'Resistance',
        });
        srResistance.setData(
          candles.map((c, i) => ({
            time: Math.floor(c.openTime / 1000) as UTCTimestamp,
            value: indicators['sr.resistance'][i],
          })).filter((d) => !Number.isNaN(d.value) && d.value > 0),
        );
        indicatorSeriesRef.current.push(srResistance);
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
        text: `${sideLabel(trade.side)} #${trade.seq}`,
        size: isHighlighted ? 2 : 1,
      });

      // Exit marker
      markers.push({
        time: exitTime,
        position: trade.side === 'BUY' ? 'aboveBar' : 'belowBar',
        color: isHighlighted ? token('--accent') : token('--muted'),
        shape: isHighlighted ? 'circle' : 'square',
        text: `Thoát #${trade.seq}`,
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
