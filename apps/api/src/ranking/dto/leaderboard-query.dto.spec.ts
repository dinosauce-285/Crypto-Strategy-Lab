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
    expect(() => parseLeaderboardQuery({})).toThrow('datasetId is required');
  });

  it('rejects an unknown sort field', () => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', sortBy: 'profit' })).toThrow(
      'sortBy must be one of',
    );
  });

  it('rejects an unknown direction', () => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', direction: 'sideways' })).toThrow(
      'direction must be one of',
    );
  });

  it.each(['0', '-1', 'abc'])('rejects a limit of %s', (limit) => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', limit })).toThrow(
      'limit must be a positive integer',
    );
  });

  it('clamps a limit above the ceiling instead of refusing it', () => {
    expect(parseLeaderboardQuery({ datasetId: 'd', limit: '10000' }).limit).toBe(500);
  });
});
