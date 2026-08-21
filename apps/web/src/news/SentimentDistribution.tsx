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
          <h2>Sentiment Analytics ({coin})</h2>
        </div>
        <p className="state">Calculating sentiment distribution…</p>
      </section>
    );
  }

  if (error && !stats) {
    return (
      <section className="panel panel-compact">
        <div className="panel-head">
          <h2>Sentiment Analytics ({coin})</h2>
        </div>
        <p className="state bad">
          <strong>Failed to load stats.</strong> {error}
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
        <h2>Sentiment Analytics ({coin})</h2>
      </div>

      {total === 0 ? (
        <p className="state">
          No sentiment data for <strong>{coin}</strong>. Run AI sentiment analysis on collected articles.
        </p>
      ) : (
        <div className="panel" style={{ gap: '0.65rem' }}>
          <div className="sentiment-bar-wrap">
            <div className="sentiment-bar" aria-label="Sentiment distribution">
              <div
                className="sentiment-bar-seg seg-pos"
                style={{ width: `${posPct}%` }}
                title={`Positive: ${posPct}% (${posCount})`}
              />
              <div
                className="sentiment-bar-seg seg-neu"
                style={{ width: `${neuPct}%` }}
                title={`Neutral: ${neuPct}% (${neuCount})`}
              />
              <div
                className="sentiment-bar-seg seg-neg"
                style={{ width: `${negPct}%` }}
                title={`Negative: ${negPct}% (${negCount})`}
              />
            </div>

            <div className="sentiment-legend">
              <span className="legend-item ok">
                <span className="legend-dot" style={{ background: 'var(--ok)' }} />
                Positive ({posPct}%)
              </span>
              <span className="legend-item" style={{ color: 'var(--muted)' }}>
                <span className="legend-dot" style={{ background: 'var(--line)' }} />
                Neutral ({neuPct}%)
              </span>
              <span className="legend-item bad">
                <span className="legend-dot" style={{ background: 'var(--bad)' }} />
                Negative ({negPct}%)
              </span>
            </div>
          </div>

          <div className="stat-tiles">
            <div className="stat-tile">
              <span className="stat-tile-label">Avg Sentiment Score</span>
              <span
                className={
                  avgScore > 0 ? 'stat-tile-val ok' : avgScore < 0 ? 'stat-tile-val bad' : 'stat-tile-val'
                }
              >
                {avgScore > 0 ? `+${avgScore.toFixed(2)}` : avgScore.toFixed(2)}
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-tile-label">Scored Articles</span>
              <span className="stat-tile-val">{total}</span>
            </div>

            <div className="stat-tile">
              <span className="stat-tile-label">Positive / Negative</span>
              <span className="stat-tile-val">
                <span className="ok">{posCount}</span> / <span className="bad">{negCount}</span>
              </span>
            </div>

            <div className="stat-tile">
              <span className="stat-tile-label">Neutral Articles</span>
              <span className="stat-tile-val">{neuCount}</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
