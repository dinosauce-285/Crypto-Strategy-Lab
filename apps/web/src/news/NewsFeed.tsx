import type { NewsItem, SentimentLabel } from '@csl/contracts';
import { clock, date } from '../market/format';

const SENTIMENT_LABELS: Record<SentimentLabel, string> = {
  POSITIVE: 'TÍCH CỰC',
  NEUTRAL: 'TRUNG LẬP',
  NEGATIVE: 'TIÊU CỰC',
};

export interface NewsFeedProps {
  items: NewsItem[];
  total?: number;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onCollectPrompt: () => void;
  isCollecting?: boolean;
}

function formatDate(epochMs: number): string {
  return `${date(epochMs)} ${clock(epochMs)}`;
}

function formatScore(score: number): string {
  const sign = score > 0 ? '+' : '';
  return `${sign}${score.toFixed(2)}`;
}

export function NewsFeed({
  items,
  total,
  isLoading,
  error,
  onRetry,
  onCollectPrompt,
  isCollecting = false,
}: NewsFeedProps) {
  if (isLoading && items.length === 0) {
    return (
      <div className="panel">
        <p className="state">Đang tải tin tức crypto…</p>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="panel">
        <p className="state bad">
          <strong>Không tải được tin tức.</strong> {error}
        </p>
        <button type="button" className="btn-action" onClick={onRetry}>
          Thử lại
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="panel">
        <div className="panel-head">
          <h2>Nguồn tin đầu vào</h2>
        </div>
        <p className="state">
          Chưa thu thập bài viết nào. Nhấn <strong>Thu thập tin tức</strong> để lấy bài viết
          mới nhất từ RSS feed và CryptoCompare.
        </p>
        <div>
          <button
            type="button"
            className="btn-action btn-primary"
            onClick={onCollectPrompt}
            disabled={isCollecting}
          >
            {isCollecting ? 'Đang thu thập…' : 'Thu thập tin tức ngay'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <h2>Nguồn tin đầu vào</h2>
        <span className="source">
          {total !== undefined && total > items.length
            ? `${items.length} / ${total} bài viết`
            : `${total ?? items.length} bài viết`}
        </span>
      </div>

      {error && (
        <p className="state bad">
          <strong>Không tải được tin tức.</strong> {error}
        </p>
      )}

      <div className="panel" style={{ gap: '0.65rem' }}>
        {items.map((item) => (
          <article key={item.id} className="news-card">
            <div className="news-card-head">
              <div className="news-meta">
                <span className="source" style={{ fontWeight: 600 }}>
                  {item.source}
                </span>
                <span>•</span>
                <span>{formatDate(item.publishedAt)}</span>
                {item.relatedCoins.map((coin) => (
                  <span key={coin} className="coin-pill">
                    {coin}
                  </span>
                ))}
              </div>

              {item.sentiment ? (
                <span
                  className={
                    item.sentiment.label === 'POSITIVE'
                      ? 'badge badge-pos'
                      : item.sentiment.label === 'NEGATIVE'
                        ? 'badge badge-neg'
                        : 'badge badge-neu'
                  }
                >
                  {SENTIMENT_LABELS[item.sentiment.label]} {formatScore(item.sentiment.score)}
                </span>
              ) : (
                <span className="badge badge-neu">CHƯA CHẤM ĐIỂM</span>
              )}
            </div>

            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-title"
            >
              {item.title} ↗
            </a>

            {item.content && <p className="news-content">{item.content}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}
