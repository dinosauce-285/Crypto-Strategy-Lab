import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MESSAGES,
  searchRunTopic,
  type Dataset,
  type RunBound,
  type RunStatus,
  type SearchMode,
  type StrategyGroup,
  type StrategyMeta,
  type StrategyRef,
} from '@csl/contracts';
import { ApiError, apiFetch } from '../api/request';
import { Header } from '../layout/Header';
import { DatasetFormModal } from '../backtest/DatasetFormModal';
import { useTopic } from '../channel/use-topic';
import { STRATEGY_GROUP_LABELS } from '../search/group-labels';
import { LeaderboardLink } from '../leaderboard/LeaderboardLink';
import { ManualCompositePanel } from '../search/ManualCompositePanel';
import { SearchControlsPanel } from '../search/SearchControlsPanel';
import { SearchProgressPanel } from '../search/SearchProgressPanel';
import { SearchRegistryState } from '../search/SearchRegistryState';
import { StrategySpacePicker } from '../search/StrategySpacePicker';

type StrategyState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; strategies: StrategyMeta[] };

/**
 * Mirrors DomainGuidedCandidateGenerator's CORE_GROUPS/CONTEXT_GROUPS
 * (apps/api/src/search/domain-guided-candidate.generator.ts) — a selection missing
 * either produces zero candidates server-side and the run ends "exhausted" at tried: 0
 * with no explanation (BUG-03). Checked here so START SEARCH can block it up front.
 */
const CORE_GROUPS: readonly StrategyGroup[] = ['Trend', 'Momentum'];
const CONTEXT_GROUPS: readonly StrategyGroup[] = ['Structure', 'Volatility', 'Information'];

export function SearchScreen() {
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [strategyState, setStrategyState] = useState<StrategyState>({ kind: 'loading' });
  const [selectedRefs, setSelectedRefs] = useState<StrategyRef[]>([]);
  const [mode, setMode] = useState<SearchMode>('domain-guided');
  const [maxCandidates, setMaxCandidates] = useState(125);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const strategies = useMemo(
    () => (strategyState.kind === 'ready' ? strategyState.strategies : []),
    [strategyState],
  );
  const runningDatasetId = status?.datasetId ?? null;
  const hasActiveRun = status ? status.state !== 'ended' : false;

  useEffect(() => {
    apiFetch<StrategyMeta[]>('/api/strategies')
      .then((list) => {
        setStrategyState({ kind: 'ready', strategies: list });
        setSelectedRefs((current) =>
          current.length > 0
            ? current
            : list.map((item) => ({ id: item.id, version: item.version })),
        );
      })
      .catch((error: Error) => setStrategyState({ kind: 'error', message: error.message }));
  }, []);

  useEffect(() => {
    apiFetch<RunStatus>('/api/search/runs/current')
      .then((current) => {
        setStatus(current);
        if (current.state !== 'ended') setSelectedRefs(current.strategyRefs);
      })
      .catch((error: Error) => {
        // Nothing started yet is the ordinary first visit, not a failure.
        if (error instanceof ApiError && error.status === 404) return;
        setRequestError(error.message);
      });
  }, []);

  useEffect(() => {
    /**
     * Only while a run is still active — once it ends, the picker unlocks and a manual
     * selection must stick instead of being pulled back to the last run's dataset.
     */
    if (!hasActiveRun || !runningDatasetId || dataset?.id === runningDatasetId) return;
    apiFetch<Dataset[]>('/api/datasets')
      .then((datasets) => {
        const match = datasets.find((item) => item.id === runningDatasetId);
        if (match) setDataset(match);
      })
      .catch(() => undefined);
  }, [dataset?.id, runningDatasetId, hasActiveRun]);

  useTopic(
    status ? searchRunTopic(status.runId) : null,
    useCallback((message) => {
      if (message.type === MESSAGES.SearchProgress) {
        setStatus(message.payload.status);
      }
    }, []),
  );

  const missingGroups = useMemo(() => {
    if (mode !== 'domain-guided') return [];
    const selectedGroups = new Set(
      selectedRefs
        .map((ref) => strategies.find((s) => s.id === ref.id && s.version === ref.version)?.group)
        .filter((group): group is StrategyGroup => Boolean(group)),
    );
    const missingCore = CORE_GROUPS.filter((group) => !selectedGroups.has(group));
    const missingContext = CONTEXT_GROUPS.some((group) => selectedGroups.has(group))
      ? []
      : [CONTEXT_GROUPS.map((group) => STRATEGY_GROUP_LABELS[group]).join('/')];
    return [...missingCore.map((group) => STRATEGY_GROUP_LABELS[group]), ...missingContext];
  }, [mode, selectedRefs, strategies]);

  const candidateLimitInvalid =
    !Number.isInteger(maxCandidates) || maxCandidates < 1 || maxCandidates > 10000;
  const blockedReason =
    candidateLimitInvalid
      ? 'Số candidate tối đa phải là số nguyên từ 1 đến 10000.'
      : missingGroups.length > 0
        ? `Chế độ Có định hướng cần nhóm ${CORE_GROUPS.map((g) => STRATEGY_GROUP_LABELS[g]).join(', ')} và ít nhất một trong số ${CONTEXT_GROUPS.map((g) => STRATEGY_GROUP_LABELS[g]).join('/')}. Còn thiếu: ${missingGroups.join(', ')}.`
        : null;

  const canStart = useMemo(
    () =>
      Boolean(dataset && selectedRefs.length > 0 && strategyState.kind === 'ready') &&
      missingGroups.length === 0 &&
      !candidateLimitInvalid,
    [dataset, selectedRefs.length, strategyState.kind, missingGroups, candidateLimitInvalid],
  );

  const start = async () => {
    if (!dataset) return;
    setBusy(true);
    setRequestError(null);
    try {
      const bound: RunBound = { maxCandidates };
      const next = await postRun('/api/search/runs', {
        datasetId: dataset.id,
        strategyRefs: selectedRefs,
        mode,
        bound,
      });
      setStatus(next);
    } catch (error) {
      setRequestError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const command = async (path: 'pause' | 'resume' | 'stop') => {
    setBusy(true);
    setRequestError(null);
    try {
      setStatus(await postRun(`/api/search/runs/${path}`));
    } catch (error) {
      setRequestError((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="screen">
      <Header title="Điều khiển Tìm kiếm" />

      {strategyState.kind === 'loading' && <SearchRegistryState kind="loading" />}

      {strategyState.kind === 'error' && (
        <SearchRegistryState kind="error" message={strategyState.message} />
      )}

      {strategyState.kind === 'ready' && strategies.length === 0 && <SearchRegistryState kind="empty" />}

      {strategyState.kind === 'ready' && strategies.length > 0 && (
        <div className="screen-body">
          <div className="screen-main">
            <StrategySpacePicker
              strategies={strategies}
              selectedRefs={selectedRefs}
              disabled={busy || hasActiveRun}
              onChange={setSelectedRefs}
            />

            <ManualCompositePanel strategies={strategies} dataset={dataset} />

            <SearchProgressPanel
              status={status}
              dataset={dataset}
              strategies={strategies}
              requestError={requestError}
              busy={busy}
              onPause={() => void command('pause')}
              onResume={() => void command('resume')}
              onStop={() => void command('stop')}
            />

            <LeaderboardLink hint="Ứng viên đã chạy xong được chấm điểm và xếp hạng ở đó." />
          </div>

          <div className="screen-side">
            <SearchControlsPanel
              dataset={dataset}
              mode={mode}
              maxCandidates={maxCandidates}
              busy={busy}
              isRunning={hasActiveRun}
              canStart={canStart}
              blockedReason={blockedReason}
              onDatasetChange={setDataset}
              onOpenDatasetModal={() => setIsModalOpen(true)}
              onModeChange={setMode}
              onMaxCandidatesChange={setMaxCandidates}
              onStart={() => void start()}
            />
          </div>
        </div>
      )}

      {isModalOpen && (
        <DatasetFormModal
          onClose={() => setIsModalOpen(false)}
          onCreated={(created) => setDataset(created)}
        />
      )}
    </main>
  );
}

function postRun(path: string, body?: unknown): Promise<RunStatus> {
  return apiFetch<RunStatus>(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}
