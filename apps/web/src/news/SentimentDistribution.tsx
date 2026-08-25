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
}

export function SentimentDistribution({
  coin,
  stats,
  isLoading,
  error,
}: SentimentDistributionProps) {
  if (isLoading && !stats) {
    return (
      <section className="panel panel-compact">
        <div className="panel-head">
          <h2>Phân tích Sentiment ({coin})</h2>
        </div>
        <p className="state">Đang tính phân bố sentiment…</p>
      </section>
    );
  }

  if (error && !stats) {
    return (
      <section className="panel panel-compact">
        <div className="panel-head">
          <h2>Phân tích Sentiment ({coin})</h2>
        </div>
        <p className="state bad">
          <strong>Không tải được số liệu thống kê.</strong> {error}
        </p>
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
    <section className="panel panel-compact">
      <div className="panel-head">
        <h2>Phân tích Sentiment ({coin})</h2>
      </div>

      {total === 0 ? (
        <p className="state">
          Chưa có dữ liệu sentiment cho <strong>{coin}</strong>. Hãy chạy phân tích
          sentiment AI trên các bài viết đã thu thập.
        </p>
      ) : (
        <div className="panel" style={{ gap: '0.65rem' }}>
          <div className="sentiment-bar-wrap">
            <div className="sentiment-bar" aria-label="Phân bố sentiment">
              <div
                className="sentiment-bar-seg seg-pos"
                style={{ width: `${posPct}%` }}
                title={`Tích cực: ${posPct}% (${posCount})`}
              />
              <div
                className="sentiment-bar-seg seg-neu"
                style={{ width: `${neuPct}%` }}
                title={`Trung lập: ${neuPct}% (${neuCount})`}
              />
              <div
                className="sentiment-bar-seg seg-neg"
                style={{ width: `${negPct}%` }}
                title={`Tiêu cực: ${negPct}% (${negCount})`}
              />
            </div>

            <div className="sentiment-legend">
              <span className="legend-item ok">
                <span className="legend-dot" style={{ background: 'var(--ok)' }} />
                Tích cực ({posPct}%)
              </span>
              <span className="legend-item" style={{ color: 'var(--muted)' }}>
                <span className="legend-dot" style={{ background: 'var(--line)' }} />
                Trung lập ({neuPct}%)
              </span>
              <span className="legend-item bad">
                <span className="legend-dot" style={{ background: 'var(--bad)' }} />
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
