import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  EVENTS,
  LEADERBOARD_SORT_FIELDS,
  SORT_DIRECTIONS,
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
    @Query('datasetId') datasetId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('direction') direction?: string,
    @Query('limit') limitStr?: string,
  ): Promise<LeaderboardEntry[]> {
    if (!datasetId || typeof datasetId !== 'string' || datasetId.trim() === '') {
      throw new BadRequestException('Query parameter "datasetId" is required');
    }

    if (sortBy && !LEADERBOARD_SORT_FIELDS.includes(sortBy as LeaderboardSortField)) {
      throw new BadRequestException(
        `Invalid sortBy parameter "${sortBy}". Allowed values: ${LEADERBOARD_SORT_FIELDS.join(', ')}`,
      );
    }

    if (direction && !SORT_DIRECTIONS.includes(direction as SortDirection)) {
      throw new BadRequestException(
        `Invalid direction parameter "${direction}". Allowed values: ${SORT_DIRECTIONS.join(', ')}`,
      );
    }

    let limit: number | undefined;
    if (limitStr !== undefined && limitStr !== '') {
      const parsedLimit = Number(limitStr);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
        throw new BadRequestException(
          `Query parameter "limit" must be an integer between 1 and 50, received "${limitStr}"`,
        );
      }
      limit = parsedLimit;
    }

    return this.ranking.getLeaderboard({
      datasetId: datasetId.trim(),
      sortBy: sortBy as LeaderboardSortField | undefined,
      direction: direction as SortDirection | undefined,
      limit,
    });
  }

  @OnEvent(EVENTS.StrategyEvaluated)
  @OnEvent(EVENTS.LeaderboardUpdated)
  @OnEvent(EVENTS.BacktestCompleted)
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
