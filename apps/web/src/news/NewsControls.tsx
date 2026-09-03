export interface NewsControlsProps {
  coin: string;
  onCoinChange: (coin: string) => void;
  source: string;
  onSourceChange: (source: string) => void;
  fromDate?: string;
  onFromDateChange?: (date: string) => void;
  toDate?: string;
  onToDateChange?: (date: string) => void;
  limit?: number;
  onLimitChange?: (limit: number) => void;
  onCollect: () => void;
  onAnalyze: () => void;
  isCollecting: boolean;
  isAnalyzing: boolean;
  feedback?: string | null;
}

const COIN_OPTIONS = ['ALL', 'BTC', 'ETH', 'SOL', 'BNB', 'XRP'];
const SOURCE_OPTIONS = [
  { value: 'ALL', label: 'Tất cả nguồn' },
  { value: 'CryptoCompare', label: 'CryptoCompare' },
  { value: 'RSS', label: 'RSS feed' },
];

export function NewsControls({
  coin,
  onCoinChange,
  source,
  onSourceChange,
  fromDate = '',
  onFromDateChange,
  toDate = '',
  onToDateChange,
  limit = 20,
  onLimitChange,
  onCollect,
  onAnalyze,
  isCollecting,
  isAnalyzing,
  feedback,
}: NewsControlsProps) {
  return (
    <div className="panel panel-box">
      <div className="controls-row">
        <div className="seg" role="group" aria-label="Chọn coin">
          {COIN_OPTIONS.map((c) => (
            <button key={c} type="button" aria-pressed={coin === c} onClick={() => onCoinChange(c)}>
              {c}
            </button>
          ))}
        </div>

        <select
          className="pair-select"
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          aria-label="Lọc theo nguồn tin"
        >
          {SOURCE_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        {onFromDateChange && (
          <label className="news-filter-field">
            Từ
            <input
              type="date"
              className="pair-select"
              value={fromDate}
              onChange={(e) => onFromDateChange(e.target.value)}
              title="Thu thập tin từ ngày"
            />
          </label>
        )}

        {onToDateChange && (
          <label className="news-filter-field">
            Đến
            <input
              type="date"
              className="pair-select"
              value={toDate}
              onChange={(e) => onToDateChange(e.target.value)}
              title="Thu thập tin đến ngày"
            />
          </label>
        )}

        {onLimitChange && (
          <label className="news-filter-field news-filter-limit">
            Số lượng
            <input
              type="number"
              className="pair-select"
              min={1}
              max={500}
              value={limit || ''}
              onChange={(e) =>
                onLimitChange(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)
              }
              title="Số lượng bài viết thu thập"
            />
          </label>
        )}

        <div className="controls-row-end">
          <button
            type="button"
            className="btn-action btn-primary"
            onClick={onCollect}
            disabled={isCollecting}
          >
            {isCollecting ? 'Đang thu thập…' : 'Thu thập tin tức'}
          </button>

          <button
            type="button"
            className="btn-action"
            onClick={onAnalyze}
            disabled={isAnalyzing}
            title="Sentiment: điểm cảm xúc thị trường được tính từ nội dung tin tức"
          >
            {isAnalyzing ? 'Đang phân tích…' : 'Chạy phân tích sentiment AI'}
          </button>
        </div>
      </div>

      {feedback && <p className="state ok">✓ {feedback}</p>}
    </div>
  );
}
