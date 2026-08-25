import type { Trade } from '@csl/contracts';
import { sideLabel, tradeTime } from '../market/format';

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
          <h2>Lệnh đã khớp</h2>
        </div>
        <p className="state">Không có lệnh nào được tạo trong khoảng backtest này.</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Lệnh đã khớp ({trades.length})</h2>
        <span className="source">Nhấn vào dòng để làm nổi bật điểm vào/ra trên biểu đồ</span>
      </div>

      <div className="candles" style={{ maxHeight: '280px', overflowY: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Chiều lệnh</th>
              <th>Thời gian vào</th>
              <th>Giá vào</th>
              <th>Thời gian ra</th>
              <th>Giá ra</th>
              <th>Lãi ròng</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => {
              const isSelected = selectedSeq === trade.seq;
              const profitNum = Number(trade.profit);
              const pnlClass = profitNum > 0 ? 'ok' : profitNum < 0 ? 'bad' : '';
              const profitSign = profitNum > 0 ? '+' : '';
              const formattedProfit = Number.isFinite(profitNum)
                ? `${profitSign}${(profitNum * 100).toFixed(2)}%`
                : '0.00%';

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
                      {sideLabel(trade.side)}
                    </span>
                  </td>
                  <td>{tradeTime(trade.entryTime)}</td>
                  <td>{trade.entryPrice}</td>
                  <td>{tradeTime(trade.exitTime)}</td>
                  <td>{trade.exitPrice}</td>
                  <td className={pnlClass} style={{ fontWeight: 600 }}>
                    {formattedProfit}
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
