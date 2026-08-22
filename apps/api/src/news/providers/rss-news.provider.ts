import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { NewsItem } from '@csl/contracts';
import { NewsProviderPort, type FetchNewsOptions } from '../ports/news-provider.port';

const DEFAULT_FEEDS = [
  'https://www.coindesk.com/arc/outboundfeeds/rss/',
  'https://cointelegraph.com/rss',
];

const KNOWN_COIN_MAP: Record<string, string[]> = {
  BTC: ['BTC', 'BITCOIN'],
  ETH: ['ETH', 'ETHEREUM', 'ETHER'],
  SOL: ['SOL', 'SOLANA'],
  XRP: ['XRP', 'RIPPLE'],
  DOGE: ['DOGE', 'DOGECOIN'],
  ADA: ['ADA', 'CARDANO'],
  BNB: ['BNB', 'BINANCE COIN', 'BINANCE'],
  AVAX: ['AVAX', 'AVALANCHE'],
  DOT: ['DOT', 'POLKADOT'],
  LINK: ['LINK', 'CHAINLINK'],
  MATIC: ['MATIC', 'POLYGON', 'POL'],
  NEAR: ['NEAR', 'NEAR PROTOCOL'],
  UNI: ['UNI', 'UNISWAP'],
  SUI: ['SUI'],
  APT: ['APT', 'APTOS'],
  LTC: ['LTC', 'LITECOIN'],
  TRX: ['TRX', 'TRON'],
  SHIB: ['SHIB', 'SHIBA INU'],
  PEPE: ['PEPE'],
};

@Injectable()
export class RssNewsProvider extends NewsProviderPort {
  readonly name = 'RSS';
  private readonly logger = new Logger(RssNewsProvider.name);

  constructor(@Optional() private readonly config?: ConfigService) {
    super();
  }

  async fetchNews(options?: FetchNewsOptions): Promise<Omit<NewsItem, 'id'>[]> {
    const rawFeeds = this.config?.get<string>('RSS_NEWS_FEEDS');
    const feedUrls = rawFeeds
      ? rawFeeds.split(',').map((f) => f.trim()).filter((f) => f.length > 0)
      : DEFAULT_FEEDS;

    const crawledAt = Date.now();
    const results = await Promise.allSettled(
      feedUrls.map((url) => this.fetchFeed(url, crawledAt)),
    );

    let allItems: Omit<NewsItem, 'id'>[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      } else {
        this.logger.warn(`Failed to fetch RSS feed: ${result.reason}`);
      }
    }

    if (options?.from !== undefined) {
      allItems = allItems.filter((item) => item.publishedAt >= options.from!);
    }

    if (options?.to !== undefined) {
      allItems = allItems.filter((item) => item.publishedAt <= options.to!);
    }

    if (options?.coins && options.coins.length > 0) {
      const requestedCoins = new Set(options.coins.map((c) => c.toUpperCase()));
      allItems = allItems.filter((item) =>
        item.relatedCoins.some((coin) => requestedCoins.has(coin)),
      );
    }

    if (options?.limit !== undefined && options.limit > 0) {
      allItems = allItems.slice(0, options.limit);
    }

    return allItems;
  }

  private async fetchFeed(feedUrl: string, crawledAt: number): Promise<Omit<NewsItem, 'id'>[]> {
    const response = await fetch(feedUrl, {
      headers: {
        Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml, text/plain, */*',
        'User-Agent': 'CryptoStrategyLab-NewsBot/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Feed request to ${feedUrl} failed: HTTP ${response.status}`);
    }

    const xml = await response.text();
    return this.parseXmlFeed(xml, feedUrl, crawledAt);
  }

  private parseXmlFeed(xml: string, feedUrl: string, crawledAt: number): Omit<NewsItem, 'id'>[] {
    const feedSource = this.extractFeedTitle(xml) || this.extractDomain(feedUrl) || 'RSS';
    const rawItems = this.extractXmlBlocks(xml);

    const items: Omit<NewsItem, 'id'>[] = [];

    for (const rawItem of rawItems) {
      const title = this.cleanText(this.extractTag(rawItem, 'title') || '');
      if (!title) continue;

      const link = this.extractLink(rawItem);
      const description = this.cleanText(
        this.extractTag(rawItem, 'description') ||
        this.extractTag(rawItem, 'summary') ||
        '',
      );
      const bodyContent = this.cleanText(
        this.extractTag(rawItem, 'content:encoded') ||
        this.extractTag(rawItem, 'content') ||
        '',
      );

      let content = '';
      if (description && bodyContent && description !== bodyContent) {
        content = `${description} ${bodyContent}`.trim();
      } else {
        content = bodyContent || description || '';
      }

      const rawDate =
        this.extractTag(rawItem, 'pubDate') ||
        this.extractTag(rawItem, 'published') ||
        this.extractTag(rawItem, 'updated') ||
        this.extractTag(rawItem, 'dc:date');

      let publishedAt = crawledAt;
      if (rawDate) {
        const parsed = Date.parse(rawDate);
        if (!isNaN(parsed)) {
          publishedAt = parsed;
        }
      }

      const categories = this.extractCategories(rawItem);
      const relatedCoins = this.extractRelatedCoins(title, content, categories);

      items.push({
        title,
        content,
        source: feedSource,
        url: link,
        publishedAt,
        crawledAt,
        relatedCoins,
      });
    }

    return items;
  }

  private extractXmlBlocks(xml: string): string[] {
    const items: string[] = [];
    const itemRegex = /<item(?:\s+[^>]*)?>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;

    while ((match = itemRegex.exec(xml)) !== null) {
      items.push(match[1]);
    }

    if (items.length === 0) {
      const entryRegex = /<entry(?:\s+[^>]*)?>([\s\S]*?)<\/entry>/gi;
      while ((match = entryRegex.exec(xml)) !== null) {
        items.push(match[1]);
      }
    }

    return items;
  }

  private extractTag(xmlChunk: string, tagName: string): string | null {
    const escapedTag = tagName.replace(':', '\\:');
    const tagRegex = new RegExp(`<${escapedTag}(?:\\s+[^>]*)?>([\\s\\S]*?)<\\/${escapedTag}>`, 'i');
    const match = xmlChunk.match(tagRegex);
    if (!match) return null;

    return this.unwrapCdata(match[1]);
  }

  private extractFeedTitle(xml: string): string | null {
    const channelMatch = xml.match(/<channel(?:\s+[^>]*)?>([\s\S]*?)<\/channel>/i);
    if (channelMatch) {
      const title = this.extractTag(channelMatch[1], 'title');
      if (title) return this.cleanText(title);
    }

    const feedMatch = xml.match(/<feed(?:\s+[^>]*)?>([\s\S]*?)<\/feed>/i);
    if (feedMatch) {
      const title = this.extractTag(feedMatch[1], 'title');
      if (title) return this.cleanText(title);
    }

    return null;
  }

  private extractLink(xmlChunk: string): string {
    const hrefMatch = xmlChunk.match(/<link(?:\s+[^>]*?)?\s+href=["']([^"']+)["']/i);
    if (hrefMatch && hrefMatch[1]) {
      return hrefMatch[1].trim();
    }

    const linkTag = this.extractTag(xmlChunk, 'link');
    if (linkTag && linkTag.trim()) {
      return linkTag.trim();
    }

    const guidTag = this.extractTag(xmlChunk, 'guid');
    if (guidTag && guidTag.trim().startsWith('http')) {
      return guidTag.trim();
    }

    const idTag = this.extractTag(xmlChunk, 'id');
    if (idTag && idTag.trim().startsWith('http')) {
      return idTag.trim();
    }

    return '';
  }

  private extractCategories(xmlChunk: string): string[] {
    const categories = new Set<string>();

    const catTagRegex = /<category(?:\s+[^>]*)?>([\s\S]*?)<\/category>/gi;
    let match: RegExpExecArray | null;
    while ((match = catTagRegex.exec(xmlChunk)) !== null) {
      const val = this.cleanText(this.unwrapCdata(match[1]));
      if (val) categories.add(val);
    }

    const catTermRegex = /<category(?:\s+[^>]*?)?\s+term=["']([^"']+)["']/gi;
    while ((match = catTermRegex.exec(xmlChunk)) !== null) {
      const val = this.cleanText(match[1]);
      if (val) categories.add(val);
    }

    return Array.from(categories);
  }

  private extractRelatedCoins(title: string, content: string, categories: string[]): string[] {
    const foundCoins = new Set<string>();
    const combinedText = `${title} ${content} ${categories.join(' ')}`;

    for (const [ticker, aliases] of Object.entries(KNOWN_COIN_MAP)) {
      for (const alias of aliases) {
        const pattern = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (pattern.test(combinedText)) {
          foundCoins.add(ticker);
          break;
        }
      }
    }

    // Also include normalized category tags
    for (const cat of categories) {
      const parts = cat.split(/[|,;/]/);
      for (const part of parts) {
        const clean = part.trim().toUpperCase();
        if (clean.length >= 2 && clean.length <= 15) {
          foundCoins.add(clean);
        }
      }
    }

    return Array.from(foundCoins);
  }

  private unwrapCdata(text: string): string {
    return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1');
  }

  private cleanText(raw: string): string {
    return this.unwrapCdata(raw)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractDomain(url: string): string | null {
    try {
      const parsed = new URL(url);
      return parsed.hostname.replace(/^www\./, '');
    } catch {
      return null;
    }
  }
}
