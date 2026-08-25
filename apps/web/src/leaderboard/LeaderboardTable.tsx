import type { LeaderboardEntry, LeaderboardSortField, SortDirection } from '@csl/contracts';

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
  const renderSortIndicator = (field: LeaderboardSortField) => {
    if (sortBy !== field) return null;
    return direction === 'asc' ? ' ▲' : ' ▼';
  };

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'badge badge-pos';
    if (rank === 2 || rank === 3) return 'badge badge-neu';
    return 'source';
  };

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
              <th style={{ width: '4rem', cursor: 'pointer' }} onClick={() => onSortChange('score')}>
                Hạng
              </th>
              <th>Tổ hợp Candidate / Strategy</th>
              <th style={{ cursor: 'pointer' }} onClick={() => onSortChange('score')}>
                Điểm{renderSortIndicator('score')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => onSortChange('totalReturn')}>
                Lợi nhuận{renderSortIndicator('totalReturn')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => onSortChange('winRate')}>
                Tỷ lệ thắng{renderSortIndicator('winRate')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => onSortChange('maxDrawdown')}>
                Drawdown tối đa{renderSortIndicator('maxDrawdown')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => onSortChange('sharpeRatio')}>
                Sharpe Ratio{renderSortIndicator('sharpeRatio')}
              </th>
              <th style={{ cursor: 'pointer' }} onClick={() => onSortChange('tradeCount')}>
                Số lệnh{renderSortIndicator('tradeCount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const retNum = entry.metrics.totalReturn;
              const retSign = retNum > 0 ? '+' : '';
              const retColor = retNum > 0 ? 'ok' : retNum < 0 ? 'bad' : '';

              const recipeSummary = entry.spec.members
                .map((m) => `${m.id}@v${m.version} (${(m.weight * 100).toFixed(0)}%)`)
                .join(' + ');

              return (
                <tr
                  key={entry.experimentId}
                  onClick={() => onSelectEntry(entry)}
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
                        hash: <code>{entry.specHash.slice(0, 8)}</code> · {entry.spec.rule} ({entry.spec.threshold})
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
