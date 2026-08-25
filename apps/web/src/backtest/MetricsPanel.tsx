import type { Metrics } from '@csl/contracts';

interface MetricsPanelProps {
  metrics: Metrics;
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const returnSign = metrics.totalReturn > 0 ? '+' : '';
  const returnColor =
    metrics.totalReturn > 0 ? 'ok' : metrics.totalReturn < 0 ? 'bad' : '';

  const pnlNum = Number(metrics.profitLoss);
  const pnlSign = pnlNum > 0 ? '+' : '';
  const pnlColor = pnlNum > 0 ? 'ok' : pnlNum < 0 ? 'bad' : '';

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Đánh giá hiệu suất</h2>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-tile-label">Tổng lợi nhuận</span>
          <span className={`stat-tile-val ${returnColor}`}>
            {returnSign}
            {(metrics.totalReturn * 100).toFixed(2)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Lãi / Lỗ</span>
          <span className={`stat-tile-val ${pnlColor}`}>
            {pnlSign}
            {metrics.profitLoss}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Tỷ lệ thắng</span>
          <span className="stat-tile-val">
            {(metrics.winRate * 100).toFixed(1)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label" title="Drawdown: mức sụt giảm vốn lớn nhất từ đỉnh xuống đáy">Drawdown tối đa</span>
          <span className="stat-tile-val bad">
            -{(metrics.maxDrawdown * 100).toFixed(2)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Số lệnh</span>
          <span className="stat-tile-val">{metrics.tradeCount}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label" title="Profit Factor: tỷ số giữa tổng lãi và tổng lỗ">Profit Factor</span>
          <span className="stat-tile-val">
            {metrics.profitFactor !== undefined
              ? metrics.profitFactor.toFixed(2)
              : '—'}
          </span>
        </div>

        <div className="stat-tile" style={{ gridColumn: 'span 2' }}>
          <span className="stat-tile-label" title="Sharpe Ratio: lợi nhuận điều chỉnh theo rủi ro (độ biến động)">Sharpe Ratio</span>
          <span className="stat-tile-val">
            {metrics.sharpeRatio !== undefined
              ? metrics.sharpeRatio.toFixed(3)
              : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
