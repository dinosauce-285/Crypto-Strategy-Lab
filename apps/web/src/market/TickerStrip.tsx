import { useCallback, useState } from 'react';
import { MESSAGES, marketPriceTopic, type ServerMessage } from '@csl/contracts';
import { useChannelStatus, useTopic } from '../channel/use-topic';
import { decimal, sideLabel } from './format';
import { PAIRS } from './PairSelect';

interface LastTrade {
  price: string;
  side: 'buy' | 'sell';
}

/**
 * The last trade on every watched pair, on every screen. It reports what the channel
 * pushed and nothing more — no 24h change, no direction, because neither is in the
 * message and the browser does not compute either one.
 */
export function TickerStrip() {
  const status = useChannelStatus();

  return (
    <div className="ticker-strip" aria-label="Giá mới nhất">
      {PAIRS.map((pair) => (
        <TickerItem key={pair} pair={pair} live={status === 'live'} />
      ))}
      {status !== 'live' && (
        <span className="ticker-note">
          {status === 'connecting' ? 'Đang mở kênh…' : 'Mất kết nối — giá đang đứng yên.'}
        </span>
      )}
    </div>
  );
}

function TickerItem({ pair, live }: { pair: string; live: boolean }) {
  const [last, setLast] = useState<LastTrade | null>(null);

  useTopic(
    marketPriceTopic(pair),
    useCallback((message: ServerMessage) => {
      if (message.type !== MESSAGES.MarketPrice) return;
      const { price, side } = message.payload;
      setLast({ price, side });
    }, []),
  );

  return (
    <span className="ticker-item">
      <span className="ticker-pair">{pair}</span>
      <span className="ticker-price" data-side={last && live ? last.side : undefined}>
        {last ? decimal(last.price) : '—'}
      </span>
      {last && <span className="ticker-side">{sideLabel(last.side)}</span>}
    </span>
  );
}
