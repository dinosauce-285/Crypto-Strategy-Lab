import { describe, it } from 'node:test';
import { strictEqual, deepStrictEqual } from 'node:assert';
import { buildCollectNewsPayload, buildNewsQuery, validateDateRange } from './news-request';

describe('News request builders (T43)', () => {
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

  describe('buildNewsQuery', () => {
    it('asks only for the page size when nothing is filtered', () => {
      const query = buildNewsQuery({ coin: 'ALL', source: 'ALL' });
      strictEqual(query.toString(), 'limit=50');
    });

    it('carries the coin and the source once they are narrowed', () => {
      const query = buildNewsQuery({ coin: 'BTC', source: 'RSS' });
      strictEqual(query.get('coin'), 'BTC');
      strictEqual(query.get('source'), 'RSS');
    });

    it('sends the date range as epoch milliseconds, with "to" covering its whole day', () => {
      const query = buildNewsQuery({
        coin: 'ALL',
        source: 'ALL',
        fromDate: '2026-09-01',
        toDate: '2026-09-02',
      });

      const expectedTo = new Date('2026-09-02');
      expectedTo.setHours(23, 59, 59, 999);

      strictEqual(query.get('from'), String(new Date('2026-09-01').getTime()));
      strictEqual(query.get('to'), String(expectedTo.getTime()));
    });

    it('omits a bound that was left empty', () => {
      const query = buildNewsQuery({ coin: 'ALL', source: 'ALL', fromDate: '2026-09-01' });
      strictEqual(query.get('to'), null);
    });
  });

  describe('buildCollectNewsPayload', () => {
    it('uses default limit 20 when limit is 0, negative, or undefined', () => {
      strictEqual(buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: 0 }).limit, 20);
      strictEqual(buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: -5 }).limit, 20);
      strictEqual(
        buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: undefined }).limit,
        20,
      );
    });

    it('uses custom limit when positive integer provided', () => {
      strictEqual(buildCollectNewsPayload({ coin: 'ALL', source: 'ALL', limit: 50 }).limit, 50);
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

    it('carries no date range — collecting is not narrowed by what the list is showing', () => {
      const payload = buildCollectNewsPayload({ coin: 'ETH', source: 'RSS', limit: 15 });
      strictEqual('from' in payload, false);
      strictEqual('to' in payload, false);
    });
  });
});
