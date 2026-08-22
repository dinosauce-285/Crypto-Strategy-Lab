import { Module } from '@nestjs/common';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { NewsRepository } from './news.repository';
import { NEWS_PROVIDERS } from './ports/news-provider.port';
import { CryptoCompareNewsProvider } from './providers/cryptocompare-news.provider';
import { RssNewsProvider } from './providers/rss-news.provider';

@Module({
  controllers: [NewsController],
  providers: [
    NewsService,
    NewsRepository,
    CryptoCompareNewsProvider,
    RssNewsProvider,
    {
      provide: NEWS_PROVIDERS,
      useFactory: (cryptoCompare: CryptoCompareNewsProvider, rss: RssNewsProvider) => [
        cryptoCompare,
        rss,
      ],
      inject: [CryptoCompareNewsProvider, RssNewsProvider],
    },
  ],
  exports: [NewsService, NewsRepository],
})
export class NewsModule {}
