import { TIMEFRAMES, type Timeframe } from '@csl/contracts';

interface TimeframeSelectProps {
  value: Timeframe;
  onChange: (timeframe: Timeframe) => void;
}

export function TimeframeSelect({ value, onChange }: TimeframeSelectProps) {
  return (
    <div className="seg" role="group" aria-label="Timeframe">
      {TIMEFRAMES.map((t) => (
        <button key={t} type="button" aria-pressed={t === value} onClick={() => onChange(t)}>
          {t}
        </button>
      ))}
    </div>
  );
}
