interface SearchRegistryStateProps {
  kind: 'loading' | 'error' | 'empty';
  message?: string;
}

export function SearchRegistryState({ kind, message }: SearchRegistryStateProps) {
  if (kind === 'loading') {
    return (
      <div className="panel search-state-panel">
        <p className="state">Đang tải dữ liệu strategy...</p>
      </div>
    );
  }

  if (kind === 'empty') {
    return (
      <div className="panel search-state-panel">
        <p className="state">Chưa có strategy nào được đăng ký.</p>
      </div>
    );
  }

  return (
    <div className="panel search-state-panel">
      <p className="state bad">
        <strong>Không tải được danh sách strategy.</strong> {message}
      </p>
      <button type="button" className="btn-action" onClick={() => window.location.reload()}>
        Thử lại
      </button>
    </div>
  );
}
