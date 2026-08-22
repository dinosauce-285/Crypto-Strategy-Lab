import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module';
import { RankingPort } from './ports/ranking.port';
import { RankingService } from './ranking.service';
import { LeaderboardController } from './leaderboard.controller';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [LeaderboardController],
  providers: [
    { provide: RankingPort, useClass: RankingService },
    RankingService,
  ],
  exports: [RankingPort],
})
export class RankingModule {}
