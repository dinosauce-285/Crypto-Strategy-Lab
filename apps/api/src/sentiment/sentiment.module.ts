import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SentimentController } from './sentiment.controller';
import { SentimentService } from './sentiment.service';
import { SentimentRepository } from './sentiment.repository';
import { SENTIMENT_PROVIDER } from './ports/sentiment-provider.port';
import { GroqSentimentProvider } from './providers/groq-sentiment.provider';
import { HeuristicSentimentProvider } from './providers/heuristic-sentiment.provider';

export function sentimentProviderFactory(
  config: ConfigService | undefined,
  groq: GroqSentimentProvider,
  heuristic: HeuristicSentimentProvider,
) {
  const apiKey = config?.get<string>('GROQ_API_KEY') || process.env.GROQ_API_KEY;
  return apiKey && apiKey.trim().length > 0 ? groq : heuristic;
}

@Module({
  controllers: [SentimentController],
  providers: [
    SentimentService,
    SentimentRepository,
    GroqSentimentProvider,
    HeuristicSentimentProvider,
    {
      provide: SENTIMENT_PROVIDER,
      useFactory: sentimentProviderFactory,
      inject: [ConfigService, GroqSentimentProvider, HeuristicSentimentProvider],
    },
  ],
  exports: [SentimentService, SentimentRepository],
})
export class SentimentModule {}
