import { parseLeaderboardQuery } from './leaderboard-query.dto';

describe('parseLeaderboardQuery', () => {
  it('leaves the optional fields undefined so the service keeps its own defaults', () => {
    expect(parseLeaderboardQuery({ datasetId: 'dataset-1' })).toEqual({
      datasetId: 'dataset-1',
      sortBy: undefined,
      direction: undefined,
      limit: undefined,
    });
  });

  it('rejects a missing datasetId', () => {
    expect(() => parseLeaderboardQuery({})).toThrow('"datasetId" is required');
  });

  it('rejects an unknown sort field', () => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', sortBy: 'profit' })).toThrow(
      'Invalid sortBy parameter "profit"',
    );
  });

  it('rejects an unknown direction', () => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', direction: 'sideways' })).toThrow(
      'Invalid direction parameter "sideways"',
    );
  });

  it.each(['0', '-1', 'abc', '51'])('rejects a limit of %s', (limit) => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', limit })).toThrow(
      'must be an integer between 1 and 50',
    );
  });

  it('accepts a limit sitting on the ceiling', () => {
    expect(parseLeaderboardQuery({ datasetId: 'd', limit: '50' }).limit).toBe(50);
  });
});
