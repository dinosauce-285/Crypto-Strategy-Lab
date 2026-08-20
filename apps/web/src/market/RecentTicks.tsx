import { useCallback, useEffect, useState } from 'react';
import { MESSAGES, marketPriceTopic, type ServerMessage } from '@csl/contracts';
import { useChannelStatus, useTopic } from '../channel/use-topic';
import { clock, decimal } from './format';

const KEEP = 5;

interface Tick {
  price: string;
  volume: string;
  side: 'buy' | 'sell';
  at: number;
}

interface RecentTicksProps {
  pair: string;
}

export function RecentTicks({ pair }: RecentTicksProps) {
  const [ticks, setTicks] = useState<Tick[]>([]);
  const status = useChannelStatus();

  useEffect(() => {
    setTicks([]);
  }, [pair]);

  useTopic(
    marketPriceTopic(pair),
    useCallback((message: ServerMessage) => {
      if (message.type !== MESSAGES.MarketPrice) return;
      const { price, volume, side, at } = message.payload;
      setTicks((held) => [{ price, volume, side, at }, ...held].slice(0, KEEP));
    }, []),
  );

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Recent ticks</h2>
      </div>

      {status === 'connecting' && ticks.length === 0 && (
        <p className="state">Opening the channel…</p>
      )}

      {status === 'down' && (
        <p className="state bad">
          <strong>The channel is unreachable.</strong> The API may be stopped — start it
          with <code>pnpm dev:api</code>. This panel reconnects on its own once it is back.
        </p>
      )}

      {status === 'live' && ticks.length === 0 && (
        <p className="state">
          Subscribed to <strong>{pair}</strong>. Waiting for the next trade.
        </p>
      )}

      {ticks.length > 0 && (
        <div className="candles">
          <table>
            <thead>
              <tr>
                <th>time</th>
                <th>price</th>
                <th>volume</th>
                <th>type</th>
              </tr>
            </thead>
            <tbody>
              {ticks.map((tick, i) => (
                <tr key={`${tick.at}-${i}`}>
                  <td>{clock(tick.at)}</td>
                  <td>{decimal(tick.price)}</td>
                  <td>{decimal(tick.volume)}</td>
                  <td className={tick.side === 'buy' ? 'ok' : 'bad'}>
                    {tick.side === 'buy' ? 'Buy' : 'Sell'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
