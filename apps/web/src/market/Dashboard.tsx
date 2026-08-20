import type { Timeframe } from '@csl/contracts';
import { CandleChart } from './CandleChart';

interface DashboardProps {
  pair: string;
  timeframes: Timeframe[];
  selected: number;
  onSelect: (index: number) => void;
}

/**
 * 4 cells, one shared pair. Timeframe per cell is controlled from outside (the
 * `TimeframeSelect` next to the pair picker) — clicking a cell selects which one that
 * control edits, so there's one timeframe switcher, not four.
 */
export function Dashboard({ pair, timeframes, selected, onSelect }: DashboardProps) {
  return (
    <section className="dashboard-grid">
      {timeframes.map((timeframe, i) => (
        // Index key is intentional: the array is always exactly 4 cells whose value
        // changes in place, never reordered/added/removed — so each cell's CandleChart
        // (and its live chart instance) stays mounted across a timeframe switch.
        <div
          className={`dashboard-cell${i === selected ? ' selected' : ''}`}
          key={i}
          role="button"
          tabIndex={0}
          aria-pressed={i === selected}
          aria-label={`Chart ${i + 1}, ${timeframe}`}
          onClick={() => onSelect(i)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelect(i);
            }
          }}
        >
          <div className="chart-frame">
            <span className="chart-label">{timeframe}</span>
            <CandleChart pair={pair} timeframe={timeframe} />
          </div>
        </div>
      ))}
    </section>
  );
}
