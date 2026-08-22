interface AnnotationsProps {
  pair: string;
}

/**
 * Reserved for chart annotations once there's something to annotate with — a
 * strategy's signals (T11+) are the first real source. Empty placeholder until then.
 */
export function Annotations({ pair }: AnnotationsProps) {
  return (
    <section className="panel panel-compact">
      <div className="panel-head">
        <h2>Annotations</h2>
      </div>
      <p className="state">
        No annotations yet for <strong>{pair}</strong>. This fills in once strategy
        signals exist.
      </p>
    </section>
  );
}
