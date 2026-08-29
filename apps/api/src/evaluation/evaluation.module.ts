import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EvaluationRepository } from './evaluation.repository';
import { EvaluatorService } from './evaluator.service';
import { EvaluatorPort } from './ports/evaluator.port';

@Module({
  imports: [PrismaModule],
  providers: [
    EvaluationRepository,
    EvaluatorService,
    {
      provide: EvaluatorPort,
      useClass: EvaluatorService,
    },
  ],
  exports: [EvaluatorPort],
})
export class EvaluationModule {}
