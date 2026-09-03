import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { buildCollectNewsPayload, validateDateRange } from './collect-payload';

describe('News collection payload builder (T43)', () => {
  describe('validateDateRange', () => {
    it('returns null when fromDate and toDate are valid', () => {
      strictEqual(validateDateRange('2026-08-01', '2026-08-10'), null);
      strictEqual(validateDateRange('2026-08-10', '2026-08-10'), null);
    });

    it('returns null when fromDate or toDate is not provided', () => {
      strictEqual(validateDateRange('', '2026-08-10'), null);
      strictEqual(validateDateRange('2026-08-01', ''), null);
      strictEqual(validateDateRange('', ''), null);
      strictEqual(validateDateRange(undefined, undefined), null);
    });

    it('returns error message when fromDate is after toDate', () => {
      const error = validateDateRange('2026-08-15', '2026-08-10');
      strictEqual(error, 'Thời gian "Từ ngày" không được sau "Đến ngày".');
    });
  });

  describe('buildCollectNewsPayload', () => {
    it('uses default limit 20 when limit is 0, negative, or undefined', () => {
      const payload1 = buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: 0 });
      strictEqual(payload1.limit, 20);

      const payload2 = buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: -5 });
      strictEqual(payload2.limit, 20);

      const payload3 = buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: undefined });
      strictEqual(payload3.limit, 20);
    });

    it('uses custom limit when positive integer provided', () => {
      const payload = buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: 50 });
      strictEqual(payload.limit, 50);
    });

    it('omits coins and source when set to ALL', () => {
      const payload = buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: 20 });
      strictEqual(payload.coins, undefined);
      strictEqual(payload.source, undefined);
    });

    it('sets specific coin array and source when selected', () => {
      const payload = buildCollectNewsPayload({ coin: 'BTC', source: 'CryptoCompare', limit: 30 });
      deepStrictEqual(payload.coins, ['BTC']);
      strictEqual(payload.source, 'CryptoCompare');
      strictEqual(payload.limit, 30);
    });

    it('converts date strings to correct timestamps', () => {
      const payload = buildCollectNewsPayload({
        coin: 'ETH',
        source: 'RSS',
        fromDate: '2026-09-01',
        toDate: '2026-09-02',
        limit: 15,
      });

      const expectedFrom = new Date('2026-09-01').getTime();
      const expectedTo = new Date('2026-09-02');
      expectedTo.setHours(23, 59, 59, 999);

      strictEqual(payload.from, expectedFrom);
      strictEqual(payload.to, expectedTo.getTime());
      strictEqual(payload.limit, 15);
      deepStrictEqual(payload.coins, ['ETH']);
      strictEqual(payload.source, 'RSS');
    });
  });
});
