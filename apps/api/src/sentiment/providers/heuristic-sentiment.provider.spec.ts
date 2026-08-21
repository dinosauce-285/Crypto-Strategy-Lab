import { HeuristicSentimentProvider } from './heuristic-sentiment.provider';

describe('HeuristicSentimentProvider', () => {
  let provider: HeuristicSentimentProvider;

  beforeEach(() => {
    provider = new HeuristicSentimentProvider();
  });

  it('should have provider name "Heuristic"', () => {
    expect(provider.name).toBe('Heuristic');
  });

  describe('Positive text classification', () => {
    it('should classify bullish rally and surge as POSITIVE with a positive score', async () => {
      const text = 'Bitcoin surges to new all-time high with massive bullish rally and institutional adoption';
      const result = await provider.analyze(text);

      expect(result.label).toBe('POSITIVE');
      expect(result.score).toBeGreaterThan(0);
      expect(result.score).toBeLessThanOrEqual(1.0);
    });

    it('should classify breakout and profit gains as POSITIVE', async () => {
      const text = 'Ethereum experiences strong breakout, record profits and massive growth in network activity';
      const result = await provider.analyze(text);

      expect(result.label).toBe('POSITIVE');
      expect(result.score).toBeGreaterThan(0);
    });
  });

  describe('Negative text classification', () => {
    it('should classify market crash and hack as NEGATIVE with a negative score', async () => {
      const text = 'Crypto market crashes as major exchange hacked, causing panic selloff and liquidation';
      const result = await provider.analyze(text);

      expect(result.label).toBe('NEGATIVE');
      expect(result.score).toBeLessThan(0);
      expect(result.score).toBeGreaterThanOrEqual(-1.0);
    });

    it('should classify regulatory crackdown and plunge as NEGATIVE', async () => {
      const text = 'SEC crackdown causes crypto tokens to plunge and suffer heavy losses';
      const result = await provider.analyze(text);

      expect(result.label).toBe('NEGATIVE');
      expect(result.score).toBeLessThan(0);
    });
  });

  describe('Neutral text classification', () => {
    it('should classify routine informational announcements as NEUTRAL with 0 score', async () => {
      const text = 'Federal Reserve scheduled routine monthly meeting for next Wednesday afternoon';
      const result = await provider.analyze(text);

      expect(result.label).toBe('NEUTRAL');
      expect(result.score).toBe(0);
    });

    it('should handle empty or whitespace text gracefully as NEUTRAL', async () => {
      const emptyResult = await provider.analyze('');
      expect(emptyResult).toEqual({ label: 'NEUTRAL', score: 0 });

      const whitespaceResult = await provider.analyze('   \n\t  ');
      expect(whitespaceResult).toEqual({ label: 'NEUTRAL', score: 0 });
    });

    it('should classify equally balanced positive and negative signals as NEUTRAL', async () => {
      const text = 'Bitcoin gains slightly despite sudden plunge and selloff';
      const result = await provider.analyze(text);

      expect(result.score).toBeGreaterThanOrEqual(-1.0);
      expect(result.score).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Score bounds and integrity', () => {
    it('should strictly return scores bounded between -1.0 and 1.0', async () => {
      const extremePositive = 'bullish surge rally soar jump gain breakout high profit growth green moon pump success';
      const posResult = await provider.analyze(extremePositive);
      expect(posResult.score).toBeGreaterThanOrEqual(-1.0);
      expect(posResult.score).toBeLessThanOrEqual(1.0);

      const extremeNegative = 'bearish crash plunge drop fall decline sink loss selloff dump collapse scam hack exploit ban fear panic';
      const negResult = await provider.analyze(extremeNegative);
      expect(negResult.score).toBeGreaterThanOrEqual(-1.0);
      expect(negResult.score).toBeLessThanOrEqual(1.0);
    });
  });
});
