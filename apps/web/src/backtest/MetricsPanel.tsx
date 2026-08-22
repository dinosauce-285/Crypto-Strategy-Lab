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
        <h2>Performance Evaluation</h2>
      </div>

      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-tile-label">Total Return</span>
          <span className={`stat-tile-val ${returnColor}`}>
            {returnSign}
            {(metrics.totalReturn * 100).toFixed(2)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Profit / Loss</span>
          <span className={`stat-tile-val ${pnlColor}`}>
            {pnlSign}
            {metrics.profitLoss}
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Win Rate</span>
          <span className="stat-tile-val">
            {(metrics.winRate * 100).toFixed(1)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Max Drawdown</span>
          <span className="stat-tile-val bad">
            -{(metrics.maxDrawdown * 100).toFixed(2)}%
          </span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Trade Count</span>
          <span className="stat-tile-val">{metrics.tradeCount}</span>
        </div>

        <div className="stat-tile">
          <span className="stat-tile-label">Profit Factor</span>
          <span className="stat-tile-val">
            {metrics.profitFactor !== undefined
              ? metrics.profitFactor.toFixed(2)
              : '—'}
          </span>
        </div>

        <div className="stat-tile" style={{ gridColumn: 'span 2' }}>
          <span className="stat-tile-label">Sharpe Ratio</span>
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
