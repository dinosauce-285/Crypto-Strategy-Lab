import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  leaderboardTopic,
  type Dataset,
  type LeaderboardEntry,
  type LeaderboardSortField,
  type SortDirection,
} from '@csl/contracts';
import { apiFetch } from '../api/request';
import { Header } from '../layout/Header';
import { DatasetPicker } from '../backtest/DatasetPicker';
import { DatasetFormModal } from '../backtest/DatasetFormModal';
import { LeaderboardTable } from '../leaderboard/LeaderboardTable';
import { useTopic } from '../channel/use-topic';

type State =
  | { kind: 'no-dataset' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; entries: LeaderboardEntry[] };

export function LeaderboardScreen() {
  const navigate = useNavigate();
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortBy, setSortBy] = useState<LeaderboardSortField>('score');
  const [direction, setDirection] = useState<SortDirection>('desc');
  const [state, setState] = useState<State>({ kind: 'no-dataset' });

  const fetchLeaderboard = useCallback(() => {
    if (!selectedDataset) {
      setState({ kind: 'no-dataset' });
      return;
    }

    setState({ kind: 'loading' });
    const controller = new AbortController();

    apiFetch<LeaderboardEntry[]>(
      `/api/leaderboard?datasetId=${selectedDataset.id}&sortBy=${sortBy}&direction=${direction}&limit=10`,
      { signal: controller.signal },
    )
      .then((data) => {
        setState({ kind: 'ready', entries: data });
      })
      .catch((err: Error) => {
        if (err.name === 'AbortError') return;
        setState({ kind: 'error', message: err.message });
      });

    return () => controller.abort();
  }, [selectedDataset, sortBy, direction]);

  useEffect(() => fetchLeaderboard(), [fetchLeaderboard]);

  // Real-time push updates: when a better candidate appears or experiment completes, refresh table
  const topic = selectedDataset ? leaderboardTopic(selectedDataset.id) : null;
  useTopic(
    topic,
    useCallback(() => {
      fetchLeaderboard();
    }, [fetchLeaderboard]),
  );

  const handleSortChange = (field: LeaderboardSortField) => {
    if (sortBy === field) {
      setDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setDirection(field === 'maxDrawdown' ? 'asc' : 'desc');
    }
  };

  const handleSelectEntry = (entry: LeaderboardEntry) => {
    navigate('/backtest', {
      state: {
        datasetId: entry.datasetId,
        spec: entry.spec,
      },
    });
  };

  return (
    <main className="screen">
      <Header
        title="Bảng xếp hạng Strategy"
        subtitle="So sánh kết quả thí nghiệm theo dataset đã chọn."
      />

      <div className="screen-main" style={{ gap: '1rem' }}>
        {/* Top Control Bar: Dataset Picker */}
        <div
          className="panel"
          style={{
            background: 'var(--surface)',
            padding: '0.85rem',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--line)',
          }}
        >
          <DatasetPicker
            selectedDataset={selectedDataset}
            onSelectDataset={setSelectedDataset}
            onOpenCreateModal={() => setIsModalOpen(true)}
          />
        </div>

        {/* Leaderboard Table / 5 States */}
        {state.kind === 'no-dataset' && (
          <div
            className="panel"
            style={{
              minHeight: '280px',
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
              gap: '0.75rem',
            }}
          >
            <p className="state" style={{ maxWidth: '48ch', lineHeight: '1.5' }}>
              Vui lòng chọn một dataset hoặc tạo dataset mới để xem bảng xếp hạng.
            </p>
            <button
              type="button"
              className="btn-action"
              onClick={() => setIsModalOpen(true)}
            >
              + Tạo dataset mới
            </button>
          </div>
        )}

        {state.kind === 'loading' && (
          <div
            className="panel grows"
            style={{
              minHeight: '280px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <p className="state">Đang tính xếp hạng trực tiếp cho dataset này…</p>
          </div>
        )}

        {state.kind === 'error' && (
          <div
            className="panel grows"
            style={{
              minHeight: '280px',
              border: '1px solid var(--line)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <p className="state bad" style={{ marginBottom: '0.75rem' }}>
              <strong>Không tải được bảng xếp hạng.</strong> {state.message}
            </p>
            <button
              type="button"
              className="btn-action"
              onClick={fetchLeaderboard}
            >
              Thử lại
            </button>
          </div>
        )}

        {state.kind === 'ready' && state.entries.length === 0 && (
          <div
            className="panel grows"
            style={{
              minHeight: '280px',
              border: '1px dashed var(--line)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '2rem',
              textAlign: 'center',
            }}
          >
            <p className="state" style={{ maxWidth: '48ch', lineHeight: '1.5' }}>
              Chưa có kết quả thí nghiệm nào hoàn tất cho dataset này. Hãy chạy kiểm thử chiến lược ở tab{' '}
              <strong>Backtest</strong> hoặc <strong>Search</strong> để ghi nhận kết quả đầu tiên.
            </p>
          </div>
        )}

        {state.kind === 'ready' && state.entries.length > 0 && (
          <LeaderboardTable
            entries={state.entries}
            sortBy={sortBy}
            direction={direction}
            onSortChange={handleSortChange}
            onSelectEntry={handleSelectEntry}
          />
        )}
      </div>

      {isModalOpen && (
        <DatasetFormModal
          onClose={() => setIsModalOpen(false)}
          onCreated={(created) => setSelectedDataset(created)}
        />
      )}
    </main>
  );
}
