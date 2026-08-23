interface SearchRegistryStateProps {
  kind: 'loading' | 'error' | 'empty';
  message?: string;
}

export function SearchRegistryState({ kind, message }: SearchRegistryStateProps) {
  if (kind === 'loading') {
    return (
      <div className="panel search-state-panel">
        <p className="state">Loading strategy registry metadata...</p>
      </div>
    );
  }

  if (kind === 'empty') {
    return (
      <div className="panel search-state-panel">
        <p className="state">No strategies are registered yet.</p>
      </div>
    );
  }

  return (
    <div className="panel search-state-panel">
      <p className="state bad">
        <strong>Failed to load strategies.</strong> {message}
      </p>
      <button type="button" className="btn-action" onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  );
}
