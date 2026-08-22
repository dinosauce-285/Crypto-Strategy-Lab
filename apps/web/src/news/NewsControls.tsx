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
  { value: 'ALL', label: 'All sources' },
  { value: 'CryptoCompare', label: 'CryptoCompare' },
  { value: 'RSS', label: 'RSS feeds' },
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
      <div className="seg" role="group" aria-label="Coin selector">
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
        aria-label="Filter by news source"
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
          {isCollecting ? 'Crawling…' : 'Crawl news'}
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={onAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analyzing…' : 'Run AI sentiment'}
        </button>
      </div>
    </div>
  );
}
