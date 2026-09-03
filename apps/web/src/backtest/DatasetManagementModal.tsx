import { useEffect, useRef, useState } from 'react';
import type { Dataset } from '@csl/contracts';
import { apiFetch } from '../api/request';
import { formatDatasetRange } from '../market/format';

interface DatasetManagementModalProps {
  datasets: readonly Dataset[];
  loading: boolean;
  listError: string | null;
  onClose: () => void;
  onDeleted: (dataset: Dataset) => void;
}

export function DatasetManagementModal({ datasets, loading, listError, onClose, onDeleted }: DatasetManagementModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const detailRequestId = useRef(0);
  const [detail, setDetail] = useState<Dataset | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Dataset | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    previousActiveElement.current = document.activeElement as HTMLElement | null;
    const focusable = modalRef.current?.querySelector<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deleting) {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !modalRef.current) return;

      const focusables = Array.from(
        modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [deleting, onClose]);

  const showDetail = async (dataset: Dataset) => {
    const requestId = ++detailRequestId.current;
    setDetailError(null);
    setLoadingDetailId(dataset.id);
    try {
      const loaded = await apiFetch<Dataset>(`/api/datasets/${dataset.id}`);
      if (requestId === detailRequestId.current) setDetail(loaded);
    } catch (error) {
      if (requestId === detailRequestId.current) {
        setDetail(null);
        setDetailError((error as Error).message);
      }
    } finally {
      if (requestId === detailRequestId.current) setLoadingDetailId(null);
    }
  };

  const deleteDataset = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const deleted = await apiFetch<Dataset>(`/api/datasets/${pendingDelete.id}`, {
        method: 'DELETE',
      });
      onDeleted(deleted);
      setPendingDelete(null);
      if (detail?.id === deleted.id) setDetail(null);
    } catch (error) {
      setDeleteError((error as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && !deleting && onClose()}>
      <div ref={modalRef} className="modal-card dataset-management-modal" role="dialog" aria-modal="true" aria-labelledby="dataset-management-title">
        <div className="panel-head">
          <h2 id="dataset-management-title">Quản lý Dataset</h2>
          <button type="button" className="btn-action" onClick={onClose} aria-label="Đóng hộp thoại" disabled={deleting}>×</button>
        </div>

        {loading ? (
          <p className="state">Đang tải danh sách dataset…</p>
        ) : listError ? (
          <p className="state bad">{listError}</p>
        ) : datasets.length === 0 ? (
          <p className="state">Chưa có dataset nào. Hãy tạo một dataset để bắt đầu backtest.</p>
        ) : (
          <div className="dataset-management-table-wrap">
            <table>
              <thead>
                <tr>
                  <th scope="col">Dataset</th>
                  <th scope="col">Khoảng thời gian</th>
                  <th scope="col">Vào lệnh</th>
                  <th scope="col">Phí</th>
                  <th scope="col">Warmup</th>
                  <th scope="col">Lợi nhuận</th>
                  <th scope="col">Drawdown</th>
                  <th scope="col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => (
                  <tr key={dataset.id}>
                    <td><strong>{dataset.pair} · {dataset.timeframe}</strong></td>
                    <td>{formatDatasetRange(dataset.from, dataset.to)}</td>
                    <td>{dataset.rules.entryPrice}</td>
                    <td>{formatFeeRate(dataset.rules.feeRate)}</td>
                    <td>{dataset.rules.warmupCandles}</td>
                    <td>{dataset.rules.profitMode}</td>
                    <td>{dataset.rules.drawdownMode}</td>
                    <td className="dataset-management-actions">
                      <button type="button" className="btn-action" disabled={loadingDetailId === dataset.id || deleting} onClick={() => void showDetail(dataset)}>{loadingDetailId === dataset.id ? 'Đang tải…' : 'Chi tiết'}</button>
                      <button type="button" className="btn-action" disabled={deleting} onClick={() => { setDeleteError(null); setPendingDelete(dataset); }}>Xoá</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {detailError && <p className="state bad">{detailError}</p>}
        {detail && <DatasetDetails dataset={detail} />}

        {pendingDelete && (
          <section className="rules-section" aria-live="polite">
            <strong>Xoá {pendingDelete.pair} · {pendingDelete.timeframe}?</strong>
            <p className="source">Dataset đã có lượt backtest sẽ không thể xoá để giữ kết quả có thể tái lập.</p>
            {deleteError && <p className="state bad">{deleteError}</p>}
            <div className="controls-row">
              <button type="button" className="btn-action btn-primary" disabled={deleting} onClick={() => void deleteDataset()}>{deleting ? 'Đang xoá…' : 'Xác nhận xoá'}</button>
              <button type="button" className="btn-action" disabled={deleting} onClick={() => setPendingDelete(null)}>Huỷ</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function DatasetDetails({ dataset }: { dataset: Dataset }) {
  return (
    <section className="rules-section" aria-live="polite">
      <strong>Chi tiết {dataset.pair} · {dataset.timeframe}</strong>
      <span className="source">{formatDatasetRange(dataset.from, dataset.to)}</span>
      <span className="source">Vào lệnh: {dataset.rules.entryPrice} · Phí: {formatFeeRate(dataset.rules.feeRate)}</span>
      <span className="source">Warmup: {dataset.rules.warmupCandles} nến · Lợi nhuận: {dataset.rules.profitMode} · Drawdown: {dataset.rules.drawdownMode}</span>
    </section>
  );
}

function formatFeeRate(feeRate: string): string {
  const percent = Number(feeRate) * 100;
  return Number.isFinite(percent) ? `${Number(percent.toFixed(4))}%` : '0%';
}
