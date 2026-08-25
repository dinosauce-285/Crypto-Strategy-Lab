import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IndicatorService } from './indicator.service';
import { IndicatorRepository } from './indicator.repository';
import { IndicatorPort } from './ports/indicator.port';

@Module({
  imports: [PrismaModule],
  providers: [
    IndicatorRepository,
    IndicatorService,
    { provide: IndicatorPort, useExisting: IndicatorService },
  ],
  exports: [IndicatorPort],
})
export class IndicatorModule {}
