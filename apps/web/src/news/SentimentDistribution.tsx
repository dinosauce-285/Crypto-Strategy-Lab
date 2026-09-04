export interface SentimentStats {
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  averageScore: number;
}

export interface SentimentDistributionProps {
  coin: string;
  stats: SentimentStats | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

function segment(offsetPct: number, widthPct: number): string {
  return `translateX(${offsetPct}%) scaleX(${widthPct / 100})`;
}

export function SentimentDistribution({
  coin,
  stats,
  isLoading,
  error,
  onRetry,
}: SentimentDistributionProps) {
  if (isLoading && !stats) {
    return (
      <section className="panel panel-box panel-compact">
        <div className="panel-head">
          <h2>Phân tích Sentiment ({coin})</h2>
        </div>
        <p className="state">Đang tính phân bố sentiment…</p>
      </section>
    );
  }

  if (error && !stats) {
    return (
      <section className="panel panel-box panel-compact">
        <div className="panel-head">
          <h2>Phân tích Sentiment ({coin})</h2>
        </div>
        <p className="state bad">
          <strong>Không tải được số liệu thống kê.</strong> {error}
        </p>
        <button type="button" className="btn-action" onClick={onRetry}>
          Thử lại
        </button>
      </section>
    );
  }

  const total = stats?.total ?? 0;
  const posCount = stats?.positive ?? 0;
  const neuCount = stats?.neutral ?? 0;
  const negCount = stats?.negative ?? 0;
  const avgScore = stats?.averageScore ?? 0;

  const posPct = total > 0 ? Math.round((posCount / total) * 100) : 0;
  const neuPct = total > 0 ? Math.round((neuCount / total) * 100) : 0;
  const negPct = total > 0 ? Math.max(0, 100 - posPct - neuPct) : 0;

  return (
    <section className="panel panel-box panel-compact">
      <div className="panel-head">
        <h2>Phân tích Sentiment ({coin})</h2>
      </div>

      {error && (
        <p className="state bad">
          <strong>Không tải được số liệu thống kê.</strong> {error}
        </p>
      )}

      {total === 0 ? (
        <p className="state">
          Chưa có dữ liệu sentiment cho <strong>{coin}</strong>. Hãy chạy phân tích
          sentiment AI trên các bài viết đã thu thập.
        </p>
      ) : (
        <div className="panel">
          <div className="sentiment-bar-wrap">
            <div className="sentiment-bar" aria-label="Phân bố sentiment">
              <div
                className="sentiment-bar-seg seg-pos"
                style={{ transform: segment(0, posPct) }}
                title={`Tích cực: ${posPct}% (${posCount})`}
              />
              <div
                className="sentiment-bar-seg seg-neu"
                style={{ transform: segment(posPct, neuPct) }}
                title={`Trung lập: ${neuPct}% (${neuCount})`}
              />
              <div
                className="sentiment-bar-seg seg-neg"
                style={{ transform: segment(posPct + neuPct, negPct) }}
                title={`Tiêu cực: ${negPct}% (${negCount})`}
              />
            </div>

            <div className="sentiment-legend">
              <span className="legend-item ok">
                <span className="legend-dot dot-pos" />
                Tích cực ({posPct}%)
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-neu" />
                Trung lập ({neuPct}%)
              </span>
              <span className="legend-item bad">
                <span className="legend-dot dot-neg" />
                Tiêu cực ({negPct}%)
              </span>
            </div>
          </div>

          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-tile-label">Điểm sentiment trung bình</span>
              <span
                className={
                  avgScore > 0 ? 'stat-tile-val ok' : avgScore < 0 ? 'stat-tile-val bad' : 'stat-tile-val'
                }
              >
                {avgScore > 0 ? `+${avgScore.toFixed(2)}` : avgScore.toFixed(2)}
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-tile-label">Bài viết đã chấm điểm</span>
              <span className="stat-tile-val">{total}</span>
            </div>

            <div className="stat-tile">
              <span className="stat-tile-label">Tích cực / Tiêu cực</span>
              <span className="stat-tile-val">
                <span className="ok">{posCount}</span> / <span className="bad">{negCount}</span>
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-tile-label">Bài viết trung lập</span>
              <span className="stat-tile-val">{neuCount}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
