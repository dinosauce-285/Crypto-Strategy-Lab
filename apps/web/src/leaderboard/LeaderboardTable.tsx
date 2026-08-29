import { useEffect, useState } from 'react';
import type { LeaderboardEntry, LeaderboardSortField, SortDirection, StrategyMeta } from '@csl/contracts';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  sortBy: LeaderboardSortField;
  direction: SortDirection;
  onSortChange: (field: LeaderboardSortField) => void;
  onSelectEntry: (entry: LeaderboardEntry) => void;
}

export function LeaderboardTable({
  entries,
  sortBy,
  direction,
  onSortChange,
  onSelectEntry,
}: LeaderboardTableProps) {
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);

  useEffect(() => {
    fetch('/api/strategies')
      .then((res) => (res.ok ? res.json() : []))
      .then((list: StrategyMeta[]) => {
        if (Array.isArray(list)) {
          setStrategies(list);
        }
      })
      .catch(() => {});
  }, []);

  const getStrategyName = (id: string) => {
    const found = strategies.find((s) => s.id === id);
    return found ? found.name : id;
  };

  const renderSortIndicator = (field: LeaderboardSortField) => {
    if (sortBy !== field) return null;
    return direction === 'asc' ? ' ▲' : ' ▼';
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'badge badge-pos';
    if (rank === 2 || rank === 3) return 'badge badge-neu';
    return 'source';
  };

  const sortAria = (field: LeaderboardSortField) =>
    sortBy === field ? (direction === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Xếp hạng Strategy (Top {entries.length})</h2>
        <span className="source">Nhấn vào một dòng để xem chi tiết ở Single-Run Backtest</span>
      </div>

      <div className="candles" style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '4rem' }} aria-sort={sortAria('score')}>
                <button
                  type="button"
                  onClick={() => onSortChange('score')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    textAlign: 'left',
                  }}
                >
                  Hạng
                </button>
              </th>
              <th>Tổ hợp Candidate / Strategy</th>
              <th aria-sort={sortAria('score')}>
                <button
                  type="button"
                  onClick={() => onSortChange('score')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Điểm{renderSortIndicator('score')}
                </button>
              </th>
              <th aria-sort={sortAria('totalReturn')}>
                <button
                  type="button"
                  onClick={() => onSortChange('totalReturn')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Lợi nhuận{renderSortIndicator('totalReturn')}
                </button>
              </th>
              <th aria-sort={sortAria('winRate')}>
                <button
                  type="button"
                  onClick={() => onSortChange('winRate')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Tỷ lệ thắng{renderSortIndicator('winRate')}
                </button>
              </th>
              <th aria-sort={sortAria('maxDrawdown')}>
                <button
                  type="button"
                  onClick={() => onSortChange('maxDrawdown')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Drawdown tối đa{renderSortIndicator('maxDrawdown')}
                </button>
              </th>
              <th aria-sort={sortAria('sharpeRatio')}>
                <button
                  type="button"
                  onClick={() => onSortChange('sharpeRatio')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Sharpe Ratio{renderSortIndicator('sharpeRatio')}
                </button>
              </th>
              <th aria-sort={sortAria('tradeCount')}>
                <button
                  type="button"
                  onClick={() => onSortChange('tradeCount')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    font: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Số lệnh{renderSortIndicator('tradeCount')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const retNum = entry.metrics.totalReturn;
              const retSign = retNum > 0 ? '+' : '';
              const retColor = retNum > 0 ? 'ok' : retNum < 0 ? 'bad' : '';

              const recipeSummary = entry.spec.members
                .map((m) => `${getStrategyName(m.id)} (${(m.weight * 100).toFixed(0)}%)`)
                .join(' + ');

              return (
                <tr
                  key={entry.experimentId}
                  tabIndex={0}
                  role="button"
                  aria-label={`Chi tiết hạng ${entry.rank}`}
                  onClick={() => onSelectEntry(entry)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelectEntry(entry);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <span className={getRankBadgeClass(entry.rank)}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                      <strong style={{ fontSize: '0.82rem' }}>{recipeSummary || 'Một Strategy'}</strong>
                      <span className="source" style={{ fontSize: '0.7rem' }}>
                        {entry.spec.rule === 'weighted' ? 'Trọng số' : entry.spec.rule} (ngưỡng {entry.spec.threshold})
                      </span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: 'var(--accent)' }}>
                    {entry.score.toFixed(4)}
                  </td>
                  <td className={retColor} style={{ fontWeight: 600 }}>
                    {retSign}{(retNum * 100).toFixed(2)}%
                  </td>
                  <td>{(entry.metrics.winRate * 100).toFixed(1)}%</td>
                  <td className="bad">-{(entry.metrics.maxDrawdown * 100).toFixed(2)}%</td>
                  <td>
                    {entry.metrics.sharpeRatio !== undefined
                      ? entry.metrics.sharpeRatio.toFixed(2)
                      : '—'}
                  </td>
                  <td>{entry.metrics.tradeCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
