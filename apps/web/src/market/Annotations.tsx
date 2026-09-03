interface LegendItem {
  color: string;
  label: string;
  // 'line' for the MA(20) overlay (it's a line series, not a fill) — 'square' for
  // everything else, matching the mockup's swatch style (docs/images/1-Realtime.jpg).
  shape: 'square' | 'line';
}

const LEGEND_ITEMS: LegendItem[] = [
  { color: 'var(--ok)', label: 'Nến tăng (Close > Open)', shape: 'square' },
  { color: 'var(--bad)', label: 'Nến giảm (Close < Open)', shape: 'square' },
  // Non-breaking space keeps "động 20" from splitting across lines — a lone "20"
  // wrapping to its own line reads worse than the label wrapping one word earlier.
  { color: 'var(--accent)', label: 'MA(20): Trung bình động 20', shape: 'line' },
  { color: 'var(--bad)', label: 'Volume: Khối lượng giao dịch', shape: 'square' },
];

/**
 * Same region L-25 flagged for promising strategy signals that never arrived (T11+) and
 * got hidden behind a permanent `return null`. Real content now: what the chart's own
 * colors and MA(20) line (T34) mean — nothing added for anything not actually on the
 * chart yet (e.g. no BUY/SELL entry).
 */
export function Annotations() {
  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Chú thích</h2>
      </div>
      <div className="panel" style={{ gap: '0.35rem' }}>
        {LEGEND_ITEMS.map((item) => (
          <span className="legend-item" key={item.label}>
            <span
              className="legend-dot"
              style={
                item.shape === 'line'
                  ? { background: item.color, width: '10px', height: '2px', borderRadius: 0 }
                  : { background: item.color, borderRadius: '2px' }
              }
            />
            {item.label}
          </span>
        ))}
      </div>
    </section>
  );
}
