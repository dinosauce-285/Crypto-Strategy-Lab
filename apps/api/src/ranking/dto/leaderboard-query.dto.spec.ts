import { InvalidLeaderboardQueryError, parseLeaderboardQuery } from './leaderboard-query.dto';

describe('parseLeaderboardQuery', () => {
  it('leaves the optional fields undefined so the service keeps its own defaults', () => {
    expect(parseLeaderboardQuery({ datasetId: 'dataset-1' })).toEqual({
      datasetId: 'dataset-1',
      sortBy: undefined,
      direction: undefined,
      limit: undefined,
    });
  });

  // Each refusal is checked for naming the value it refused, not for its exact wording:
  // that wording is what the user reads (ADR 0044) and is expected to be edited.
  it('rejects a missing datasetId', () => {
    expect(() => parseLeaderboardQuery({})).toThrow(InvalidLeaderboardQueryError);
  });

  it('rejects an unknown sort field, naming it', () => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', sortBy: 'profit' })).toThrow('"profit"');
  });

  it('rejects an unknown direction, naming it', () => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', direction: 'sideways' })).toThrow(
      '"sideways"',
    );
  });

  it.each(['0', '-1', 'abc', '51'])('rejects a limit of %s, naming it', (limit) => {
    expect(() => parseLeaderboardQuery({ datasetId: 'd', limit })).toThrow(`"${limit}"`);
  });

  it('accepts a limit sitting on the ceiling', () => {
    expect(parseLeaderboardQuery({ datasetId: 'd', limit: '50' }).limit).toBe(50);
  });
});
