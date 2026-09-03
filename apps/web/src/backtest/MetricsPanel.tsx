import type { Metrics } from '@csl/contracts';

interface MetricsPanelProps {
  metrics: Metrics;
}

function tone(value: number): string {
  return value > 0 ? 'ok' : value < 0 ? 'bad' : '';
}

export function MetricsPanel({ metrics }: MetricsPanelProps) {
  const pnlNum = Number(metrics.profitLoss);

  const pf = metrics.profitFactor;
  const pfTone = pf === undefined ? '' : pf >= 1.5 ? 'ok' : pf >= 1.0 ? '' : 'bad';
  const pfNote =
    pf === undefined
      ? ''
      : pf >= 1.5
        ? 'Tốt (>1.5)'
        : pf >= 1.0
          ? 'Lãi > Lỗ (>1.0)'
          : 'Tổng lỗ > Lãi (<1.0)';

  const sr = metrics.sharpeRatio;
  const srTone = sr === undefined ? '' : sr >= 1.0 ? 'ok' : sr > 0 ? '' : 'bad';
  const srNote =
    sr === undefined
      ? ''
      : sr >= 2.0
        ? 'Rất tốt (>2.0)'
        : sr >= 1.0
          ? 'Tốt (1.0–2.0)'
          : sr > 0
            ? 'Trung bình (0–1.0)'
            : 'Kém (<0)';

  const dd = metrics.maxDrawdown;

  return (
    <div className="panel panel-box">
      <div className="panel-head">
        <h2>Đánh giá hiệu suất</h2>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span
            className="stat-tile-label"
            title="Tổng lợi nhuận: tỷ suất sinh lời thực tế theo quy tắc tính lãi của dataset"
          >
            Tổng lợi nhuận
          </span>
          <span className={`stat-tile-val ${tone(metrics.totalReturn)}`}>
            {metrics.totalReturn > 0 ? '+' : ''}
            {(metrics.totalReturn * 100).toFixed(2)}%
          </span>
        </div>

        <div className="stat-tile">
          <span
            className="stat-tile-label"
            title="Tổng tỷ suất đơn: tổng đại số tỷ suất của tất cả các lệnh (linear sum)"
          >
            Tổng tỷ suất đơn
          </span>
          <span className={`stat-tile-val ${tone(pnlNum)}`}>
            {pnlNum > 0 ? '+' : ''}
            {Number.isFinite(pnlNum) ? `${(pnlNum * 100).toFixed(2)}%` : '0.00%'}
          </span>
        </div>

        <div className="stat-tile">
          <span
            className="stat-tile-label"
            title="Tỷ lệ thắng: số lệnh có lãi / tổng số lệnh thực hiện"
          >
            Tỷ lệ thắng
          </span>
          <span className="stat-tile-val">{(metrics.winRate * 100).toFixed(1)}%</span>
        </div>

        <div className="stat-tile">
          <span
            className="stat-tile-label"
            title="Drawdown: mức sụt giảm tài khoản lớn nhất từ đỉnh xuống đáy"
          >
            Drawdown tối đa
          </span>
          <span className={`stat-tile-val ${dd > 0 ? 'bad' : ''}`}>
            {dd > 0 ? '-' : ''}
            {(dd * 100).toFixed(2)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label" title="Tổng số lệnh đã khớp và đóng">
            Số lệnh
          </span>
          <span className="stat-tile-val">{metrics.tradeCount}</span>
        </div>

        <div className="stat-tile">
          <span
            className="stat-tile-label"
            title="Profit Factor: tổng lãi chia tổng lỗ. > 1.0 là tổng lãi lớn hơn tổng lỗ, < 1.0 là tổng lỗ lớn hơn tổng lãi (dù có thể thứ tự lệnh tạo lãi kép dương ngắn hạn)."
          >
            Profit Factor
          </span>
          <span className={`stat-tile-val ${pfTone}`}>{pf !== undefined ? pf.toFixed(2) : '—'}</span>
          {pfNote && <span className="stat-tile-note">{pfNote}</span>}
        </div>

        <div className="stat-tile">
          <span
            className="stat-tile-label"
            title="Sharpe Ratio: tỷ suất lợi nhuận điều chỉnh theo độ biến động rủi ro. Thang đo: < 0 (Kém), 0–1 (Trung bình), 1–2 (Tốt), > 2 (Rất tốt)."
          >
            Sharpe Ratio
          </span>
          <span className={`stat-tile-val ${srTone}`}>{sr !== undefined ? sr.toFixed(2) : '—'}</span>
          {srNote && <span className="stat-tile-note">{srNote}</span>}
        </div>
      </div>
    </div>
  );
}
