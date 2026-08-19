import { useCallback, useEffect, useState } from 'react';
import {
  MESSAGES,
  TIMEFRAMES,
  marketCandleTopic,
  marketPriceTopic,
  type Candle,
  type ServerMessage,
  type Timeframe,
} from '@csl/contracts';
import { useChannelStatus, useTopic } from '../channel/use-topic';
import { clock, decimal } from './format';

const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];
const KEEP = 8;

interface Tick {
  price: string;
  at: number;
}

export function MarketPanel() {
  const [pair, setPair] = useState(PAIRS[0]);
  const [timeframe, setTimeframe] = useState<Timeframe>('1m');
  const [tick, setTick] = useState<Tick | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [fresh, setFresh] = useState(false);
  const status = useChannelStatus();

  const priceTopic = marketPriceTopic(pair);
  const candleTopic = marketCandleTopic(pair, timeframe);

  useEffect(() => {
    setTick(null);
    setCandles([]);
  }, [pair]);

  useEffect(() => {
    setCandles([]);
  }, [timeframe]);

  useTopic(
    priceTopic,
    useCallback((message: ServerMessage) => {
      if (message.type !== MESSAGES.MarketPrice) return;
      setTick({ price: message.payload.price, at: message.payload.at });
      setFresh(true);
    }, []),
  );

  useTopic(
    candleTopic,
    useCallback((message: ServerMessage) => {
      if (message.type !== MESSAGES.MarketCandle) return;
      setCandles((held) => [message.payload.candle, ...held].slice(0, KEEP));
    }, []),
  );

  useEffect(() => {
    if (!fresh) return;
    const timer = setTimeout(() => setFresh(false), 180);
    return () => clearTimeout(timer);
  }, [fresh, tick]);

  const stale = status !== 'live';
  const seen = tick ?? candles.length > 0;

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Live market</h2>
        <select
          className="pair-select"
          value={pair}
          onChange={(e) => setPair(e.target.value)}
          aria-label="Trading pair"
        >
          {PAIRS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <div className="seg" role="group" aria-label="Timeframe">
          {TIMEFRAMES.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === timeframe}
              onClick={() => setTimeframe(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {status === 'connecting' && !seen && <p className="state">Opening the channel…</p>}

      {status === 'down' && (
        <p className="state bad">
          <strong>The channel is unreachable.</strong> The API may be stopped — start it with{' '}
          <code>pnpm dev:api</code>. This page reconnects on its own once it is back.
        </p>
      )}

      {status === 'live' && !seen && (
        <p className="state">
          Subscribed to <strong>{pair}</strong> on <strong>{timeframe}</strong>. Waiting for the
          market to move — a price arrives on the next trade, a candle when this one closes.
        </p>
      )}

      {tick && (
        <div className="price">
          <span className="n" data-fresh={fresh && !stale} data-stale={stale}>
            {decimal(tick.price)}
          </span>
          <span className="at">
            {stale ? 'stale — last seen ' : 'last trade '}
            {clock(tick.at)}
          </span>
        </div>
      )}

      {candles.length > 0 && (
        <div className="candles">
          <table>
            <thead>
              <tr>
                <th>closed {timeframe}</th>
                <th>open</th>
                <th>high</th>
                <th>low</th>
                <th>close</th>
                <th>volume</th>
              </tr>
            </thead>
            <tbody>
              {candles.map((candle) => (
                <tr key={candle.openTime}>
                  <td>{clock(candle.openTime)}</td>
                  <td>{decimal(candle.open)}</td>
                  <td>{decimal(candle.high)}</td>
                  <td>{decimal(candle.low)}</td>
                  <td>{decimal(candle.close)}</td>
                  <td>{decimal(candle.volume)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {status === 'live' && tick && candles.length === 0 && (
        <p className="state">
          No <strong>{timeframe}</strong> candle has closed since you subscribed.
        </p>
      )}

      <p className="source">
        {priceTopic} · {candleTopic}
      </p>
    </section>
  );
}
