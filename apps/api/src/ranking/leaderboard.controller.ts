import { Controller, Get, Query } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { leaderboardTopic, MESSAGES, type LeaderboardEntry } from '@csl/contracts';
import { RankingPort } from './ports/ranking.port';
import { ChannelPublisher } from '../realtime/ports/channel-publisher.port';
import { parseLeaderboardQuery } from './dto/leaderboard-query.dto';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(
    private readonly ranking: RankingPort,
    private readonly channel: ChannelPublisher,
  ) {}

  @Get()
  async getLeaderboard(
    @Query('datasetId') datasetId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('direction') direction?: string,
    @Query('limit') limit?: string,
  ): Promise<LeaderboardEntry[]> {
    return this.ranking.getLeaderboard(
      parseLeaderboardQuery({ datasetId, sortBy, direction, limit }),
    );
  }

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
