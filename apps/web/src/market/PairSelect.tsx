export const PAIRS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'];

interface PairSelectProps {
  value: string;
  onChange: (pair: string) => void;
}

export function PairSelect({ value, onChange }: PairSelectProps) {
  return (
    <select
      className="pair-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Cặp giao dịch"
    >
      {PAIRS.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}
