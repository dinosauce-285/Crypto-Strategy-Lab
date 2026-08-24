export function StrategyIntegrationCard() {
  return (
    <section className="panel panel-compact">
      <div className="panel-head">
        <h2>Tích hợp Strategy</h2>
      </div>

      <p className="state">
        Điểm sentiment đã lưu được đưa thẳng vào <strong>NewsSentimentStrategy</strong>{' '}
        (Task T25) trong strategy registry.
      </p>

      <dl>
        <dt>Tín hiệu Long</dt>
        <dd className="ok">Điểm &gt; +0.70</dd>

        <dt>Tín hiệu Short</dt>
        <dd className="bad">Điểm &lt; -0.70</dd>

        <dt>Quy tắc Backtest</dt>
        <dd>Sắp xếp nghiêm ngặt theo timestamp (không có lookahead bias)</dd>

        <dt>Lưu trữ</dt>
        <dd className="ok">Lưu ngay khi thu thập (ADR 0005)</dd>
      </dl>
    </section>
  );
}
