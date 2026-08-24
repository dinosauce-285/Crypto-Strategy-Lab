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
        <h2>Chú thích</h2>
      </div>
      <p className="state">
        Chưa có chú thích nào cho <strong>{pair}</strong>. Mục này sẽ được điền khi có
        tín hiệu từ strategy.
      </p>
    </section>
  );
}
