import type { Trade } from '@csl/contracts';

interface TradeRow extends Trade {
  seq: number;
}

interface TradesTableProps {
  trades: TradeRow[];
  selectedSeq: number | null;
  onSelectTrade: (trade: TradeRow) => void;
}

export function TradesTable({
  trades,
  selectedSeq,
  onSelectTrade,
}: TradesTableProps) {
  if (trades.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h2>Executed Trades</h2>
        </div>
        <p className="state">No trades generated during this backtest window.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Executed Trades ({trades.length})</h2>
        <span className="source">Click row to highlight entry/exit on chart</span>
      </div>

      <div className="candles" style={{ maxHeight: '280px', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Side</th>
              <th>Entry Time</th>
              <th>Entry Price</th>
              <th>Exit Time</th>
              <th>Exit Price</th>
              <th>Net Profit</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const isSelected = selectedSeq === trade.seq;
              const profitNum = Number(trade.profit);
              const pnlClass = profitNum > 0 ? 'ok' : profitNum < 0 ? 'bad' : '';

              return (
                <tr
                  key={trade.seq}
                  onClick={() => onSelectTrade(trade)}
                  style={{
                    cursor: 'pointer',
                    background: isSelected ? 'var(--line)' : undefined,
                  }}
                >
                  <td style={{ fontWeight: 600 }}>#{trade.seq}</td>
                  <td>
                    <span
                      className={`badge ${trade.side === 'BUY' ? 'badge-pos' : 'badge-neg'}`}
                    >
                      {trade.side}
                    </span>
                  </td>
                  <td>{new Date(trade.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{trade.entryPrice}</td>
                  <td>{new Date(trade.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td>{trade.exitPrice}</td>
                  <td className={pnlClass} style={{ fontWeight: 600 }}>
                    {profitNum > 0 ? '+' : ''}
                    {trade.profit}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
