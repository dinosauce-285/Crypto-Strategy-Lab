import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  MESSAGES,
  searchRunTopic,
  type Dataset,
  type RunBound,
  type RunStatus,
  type SearchMode,
  type StrategyMeta,
  type StrategyRef,
} from '@csl/contracts';
import { Header } from '../layout/Header';
import { DatasetFormModal } from '../backtest/DatasetFormModal';
import { useTopic } from '../channel/use-topic';
import { SearchControlsPanel } from '../search/SearchControlsPanel';
import { SearchProgressPanel } from '../search/SearchProgressPanel';
import { SearchRegistryState } from '../search/SearchRegistryState';
import { StrategySpacePicker } from '../search/StrategySpacePicker';

type StrategyState =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; strategies: StrategyMeta[] };

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

  const strategies = strategyState.kind === 'ready' ? strategyState.strategies : [];
  const runningDatasetId = status?.datasetId ?? null;
  const hasActiveRun = status ? status.state !== 'ended' : false;

  useEffect(() => {
    fetch('/api/strategies')
      .then((res) => readJson<StrategyMeta[]>(res))
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
    fetch('/api/search/runs/current')
      .then((res) => {
        if (res.status === 404) return null;
        return readJson<RunStatus>(res);
      })
      .then((current) => {
        if (!current) return;
        setStatus(current);
        setSelectedRefs(current.strategyRefs);
      })
      .catch((error: Error) => setRequestError(error.message));
  }, []);

  useEffect(() => {
    if (!runningDatasetId || dataset?.id === runningDatasetId) return;
    fetch('/api/datasets')
      .then((res) => readJson<Dataset[]>(res))
      .then((datasets) => {
        const match = datasets.find((item) => item.id === runningDatasetId);
        if (match) setDataset(match);
      })
      .catch(() => undefined);
  }, [dataset?.id, runningDatasetId]);

  useTopic(
    status ? searchRunTopic(status.runId) : null,
    useCallback((message) => {
      if (message.type === MESSAGES.SearchProgress) {
        setStatus(message.payload.status);
      }
    }, []),
  );

  const canStart = useMemo(
    () => Boolean(dataset && selectedRefs.length > 0 && strategyState.kind === 'ready'),
    [dataset, selectedRefs.length, strategyState.kind],
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
      <Header title="Search Control" />

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
          </div>

          <SearchControlsPanel
            dataset={dataset}
            mode={mode}
            maxCandidates={maxCandidates}
            busy={busy}
            isRunning={hasActiveRun}
            canStart={canStart}
            onDatasetChange={setDataset}
            onOpenDatasetModal={() => setIsModalOpen(true)}
            onModeChange={setMode}
            onMaxCandidatesChange={setMaxCandidates}
            onStart={() => void start()}
          />
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

async function readJson<T>(response: Response): Promise<T> {
  if (response.ok) return response.json() as Promise<T>;
  throw new Error(`HTTP ${response.status}`);
}

async function postRun(path: string, body?: unknown): Promise<RunStatus> {
  const response = await fetch(path, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  return readJson<RunStatus>(response);
}
