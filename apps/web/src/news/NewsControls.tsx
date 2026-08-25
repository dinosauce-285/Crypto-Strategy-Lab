export interface NewsControlsProps {
  coin: string;
  onCoinChange: (coin: string) => void;
  source: string;
  onSourceChange: (source: string) => void;
  onCollect: () => void;
  onAnalyze: () => void;
  isCollecting: boolean;
  isAnalyzing: boolean;
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
  onCollect,
  onAnalyze,
  isCollecting,
  isAnalyzing,
}: NewsControlsProps) {
  return (
    <div className="controls-row" style={{ flexWrap: 'wrap' }}>
      <div className="seg" role="group" aria-label="Chọn coin">
        {COIN_OPTIONS.map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={coin === c}
            onClick={() => onCoinChange(c)}
          >
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

      <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.4rem' }}>
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
  );
}
