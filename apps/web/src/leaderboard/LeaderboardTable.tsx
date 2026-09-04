import { useEffect, useState } from 'react';
import type {
  LeaderboardEntry,
  LeaderboardSortField,
  SortDirection,
  StrategyMeta,
} from '@csl/contracts';
import { apiFetch } from '../api/request';
import { formatParams } from '../backtest/param-labels';
import { scoreTooltip } from './score-formula';
import { varyingParamNames, varyingParamText } from './varying-params';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  sortBy: LeaderboardSortField;
  direction: SortDirection;
  onSortChange: (field: LeaderboardSortField) => void;
  onSelectEntry: (entry: LeaderboardEntry) => void;
}

const COLUMNS: Array<{ field: LeaderboardSortField; label: string }> = [
  { field: 'score', label: 'Điểm' },
  { field: 'totalReturn', label: 'Lợi nhuận' },
  { field: 'winRate', label: 'Tỷ lệ thắng' },
  { field: 'maxDrawdown', label: 'Drawdown tối đa' },
  { field: 'sharpeRatio', label: 'Sharpe Ratio' },
  { field: 'tradeCount', label: 'Số lệnh' },
];

export function LeaderboardTable({
  entries,
  sortBy,
  direction,
  onSortChange,
  onSelectEntry,
}: LeaderboardTableProps) {
  const [strategies, setStrategies] = useState<StrategyMeta[]>([]);
  const varying = varyingParamNames(entries);

  useEffect(() => {
    apiFetch<StrategyMeta[]>('/api/strategies')
      .then((list) => {
        if (Array.isArray(list)) setStrategies(list);
      })
      .catch(() => {});
  }, []);

  const strategyName = (id: string) => strategies.find((s) => s.id === id)?.name ?? id;

  return (
    <div className="panel panel-box grows">
      <div className="panel-head">
        <h2>Xếp hạng Strategy (Top {entries.length})</h2>
        <span className="source">Nhấn vào một dòng để xem chi tiết ở Single-Run Backtest</span>
      </div>

      <div className="table-scroll grows">
        <table>
          <thead>
            <tr>
              <th>Hạng</th>
              <th className="text-cell">Tổ hợp Candidate / Strategy</th>
              {COLUMNS.map(({ field, label }) => (
                <th
                  key={field}
                  aria-sort={
                    sortBy === field ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'
                  }
                  title={field === 'score' ? scoreTooltip(entries[0]?.scoreFormulaVersion) : undefined}
                >
                  <button type="button" onClick={() => onSortChange(field)}>
                    {label}
                    {sortBy === field && (direction === 'asc' ? ' ▲' : ' ▼')}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const retNum = entry.metrics.totalReturn;
              const ddNum = entry.metrics.maxDrawdown;

              const recipeSummary = entry.spec.members
                .map((m) => {
                  const differs = varyingParamText(m.params, varying.get(m.id));
                  const weight = `${(m.weight * 100).toFixed(0)}%`;
                  return `${strategyName(m.id)} (${differs ? `${weight}, ${differs}` : weight})`;
                })
                .join(' + ');

              const recipeDetail = entry.spec.members
                .map((m) => `${strategyName(m.id)} v${m.version}: ${formatParams(m.params, 'long')}`)
                .join('\n');

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
                >
                  <td>
                    <span className={`badge ${entry.rank <= 3 ? 'badge-key' : 'badge-neu'}`}>
                      #{entry.rank}
                    </span>
                  </td>
                  <td className="text-cell" title={recipeDetail}>
                    <div className="recipe-cell">
                      <strong>{recipeSummary || 'Một Strategy'}</strong>
                      <span className="source">
                        {entry.spec.rule === 'weighted' ? 'Trọng số' : entry.spec.rule} (ngưỡng{' '}
                        {entry.spec.threshold})
                      </span>
                    </div>
                  </td>
                  <td className="cell-score">{entry.score.toFixed(4)}</td>
                  <td className={`cell-strong ${retNum > 0 ? 'ok' : retNum < 0 ? 'bad' : ''}`}>
                    {retNum > 0 ? '+' : ''}
                    {(retNum * 100).toFixed(2)}%
                  </td>
                  <td>{(entry.metrics.winRate * 100).toFixed(1)}%</td>
                  <td className={ddNum > 0 ? 'bad' : ''}>
                    {ddNum > 0 ? '-' : ''}
                    {(ddNum * 100).toFixed(2)}%
                  </td>
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
