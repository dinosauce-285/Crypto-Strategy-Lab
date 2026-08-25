import { Controller, Get, Query } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  leaderboardTopic,
  MESSAGES,
  type LeaderboardEntry,
  type LeaderboardSortField,
  type SortDirection,
} from '@csl/contracts';
import { RankingPort } from './ports/ranking.port';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly ranking: RankingPort,
    private readonly channel: ChannelPublisher,
  ) {}

  @Get()
  async getLeaderboard(
    @Query('datasetId') datasetId: string,
    @Query('sortBy') sortBy?: LeaderboardSortField,
    @Query('direction') direction?: SortDirection,
    @Query('limit') limitStr?: string,
  ): Promise<LeaderboardEntry[]> {
    const limit = limitStr ? parseInt(limitStr, 10) : undefined;
    return this.ranking.getLeaderboard({
      datasetId,
      sortBy,
      direction,
      limit,
    });
  }

  @OnEvent(EVENTS.StrategyEvaluated)
  @OnEvent(EVENTS.LeaderboardUpdated)
  @OnEvent('experiment.completed')
  handleExperimentCompleted(event: { datasetId: string; experimentId?: string }) {
    if (event?.datasetId) {
      const topic = leaderboardTopic(event.datasetId);
      this.channel.publish(topic, {
        type: MESSAGES.LeaderboardUpdate,
        payload: {
          datasetId: event.datasetId,
          at: Date.now(),
        },
      });
    }
  }
}
