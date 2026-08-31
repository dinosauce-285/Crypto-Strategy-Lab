import { LeaderboardController } from './leaderboard.controller';
import type { RankingPort } from './ports/ranking.port';
import type { ChannelPublisher } from '../realtime/ports/channel-publisher.port';

describe('LeaderboardController', () => {
  let controller: LeaderboardController;
  let mockRanking: jest.Mocked<RankingPort>;
  let mockChannel: jest.Mocked<ChannelPublisher>;

  beforeEach(() => {
    mockRanking = {
      getLeaderboard: jest.fn().mockResolvedValue([
        {
          rank: 1,
          experimentId: 'exp-1',
          datasetId: 'ds-1',
          spec: { rule: 'weighted', threshold: 0.5, members: [] },
          specHash: 'h-1',
          metrics: {
            totalReturn: 0.2,
            profitLoss: '20',
            winRate: 0.6,
            tradeCount: 20,
            maxDrawdown: 0.1,
          },
          score: 0.18,
          scoreFormulaVersion: 'v1',
          createdAt: 1000,
        },
      ]),
    } as unknown as jest.Mocked<RankingPort>;

    mockChannel = {
      publish: jest.fn(),
    } as unknown as jest.Mocked<ChannelPublisher>;

    controller = new LeaderboardController(mockRanking, mockChannel);
  });

  it('delegates getLeaderboard to RankingPort', async () => {
    const list = await controller.getLeaderboard('ds-1', 'score', 'desc', '10');
    expect(list).toHaveLength(1);
    expect(mockRanking.getLeaderboard).toHaveBeenCalledWith({
      datasetId: 'ds-1',
      sortBy: 'score',
      direction: 'desc',
      limit: 10,
    });
  });

  it('throws BadRequestException when datasetId is missing or empty', async () => {
    await expect(controller.getLeaderboard('')).rejects.toThrow(
      'Query parameter "datasetId" is required',
    );
  });

  it('throws BadRequestException when sortBy is invalid', async () => {
    await expect(
      controller.getLeaderboard('ds-1', 'DROP_TABLE' as never),
    ).rejects.toThrow('Invalid sortBy parameter "DROP_TABLE"');
  });

  it('throws BadRequestException when direction is invalid', async () => {
    await expect(
      controller.getLeaderboard('ds-1', 'score', 'sideways' as never),
    ).rejects.toThrow('Invalid direction parameter "sideways"');
  });

  it('throws BadRequestException when limit is not a valid integer between 1 and 50', async () => {
    await expect(
      controller.getLeaderboard('ds-1', 'score', 'desc', 'abc'),
    ).rejects.toThrow('Query parameter "limit" must be an integer between 1 and 50, received "abc"');

    await expect(
      controller.getLeaderboard('ds-1', 'score', 'desc', '-5'),
    ).rejects.toThrow('Query parameter "limit" must be an integer between 1 and 50, received "-5"');

    await expect(
      controller.getLeaderboard('ds-1', 'score', 'desc', '999'),
    ).rejects.toThrow('Query parameter "limit" must be an integer between 1 and 50, received "999"');
  });

  it('publishes update notification when backtest.completed event fires', () => {
    controller.handleExperimentCompleted({ datasetId: 'ds-1', experimentId: 'exp-1' });

    expect(mockChannel.publish).toHaveBeenCalledWith(
      'leaderboard:ds-1',
      expect.objectContaining({
        type: 'leaderboard.update',
        payload: expect.objectContaining({
          datasetId: 'ds-1',
        }),
      }),
    );
  });

  it('publishes update notification when strategy.evaluated event fires', () => {
    controller.handleExperimentCompleted({ datasetId: 'ds-1' });

    expect(mockChannel.publish).toHaveBeenCalledWith(
      'leaderboard:ds-1',
      expect.objectContaining({
        type: 'leaderboard.update',
        payload: expect.objectContaining({
          datasetId: 'ds-1',
        }),
      }),
    );
  });
});
