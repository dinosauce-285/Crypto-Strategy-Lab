export function StrategyIntegrationCard() {
  return (
    <section className="panel panel-compact">
      <div className="panel-head">
        <h2>Strategy Integration</h2>
      </div>

      <p className="state">
        Stored sentiment scores feed directly into <strong>NewsSentimentStrategy</strong> (Task T25) in the strategy registry.
      </p>

      <dl>
        <dt>Long Signal</dt>
        <dd className="ok">Score &gt; +0.70</dd>

        <dt>Short Signal</dt>
        <dd className="bad">Score &lt; -0.70</dd>

        <dt>Backtest Rule</dt>
        <dd>Strict timestamp ordering (no lookahead bias)</dd>

        <dt>Persistence</dt>
        <dd className="ok">Store-on-ingest (ADR 0005)</dd>
      </dl>
    </section>
  );
}
