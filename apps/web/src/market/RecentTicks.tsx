import { useCallback, useEffect, useState } from 'react';
import { MESSAGES, marketPriceTopic, type ServerMessage } from '@csl/contracts';
import { useChannelStatus, useTopic } from '../channel/use-topic';
import { clock, decimal, sideLabel } from './format';

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
    <section className="panel panel-box">
      <div className="panel-head">
        <h2>Giao dịch gần đây</h2>
      </div>

      {status === 'connecting' && ticks.length === 0 && (
        <p className="state">Đang mở kênh kết nối…</p>
      )}

      {status === 'down' && (
        <p className="state bad">
          <strong>Không kết nối được kênh.</strong> API có thể đang tắt. Panel này sẽ tự kết
          nối lại khi API hoạt động trở lại.
        </p>
      )}

      {status === 'live' && ticks.length === 0 && (
        <p className="state">
          Đã theo dõi <strong>{pair}</strong>. Đang chờ giao dịch tiếp theo.
        </p>
      )}

      {ticks.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>thời gian</th>
                <th>giá</th>
                <th>khối lượng</th>
                <th>loại</th>
              </tr>
            </thead>
            <tbody>
              {ticks.map((tick, i) => (
                <tr key={`${tick.at}-${i}`}>
                  <td>{clock(tick.at)}</td>
                  <td className={tick.side === 'buy' ? 'ok' : 'bad'}>{decimal(tick.price)}</td>
                  <td>{decimal(tick.volume)}</td>
                  <td className={tick.side === 'buy' ? 'ok' : 'bad'}>
                    {sideLabel(tick.side)}
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
