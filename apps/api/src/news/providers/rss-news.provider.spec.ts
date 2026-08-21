import { ConfigService } from '@nestjs/config';
import type { NewsItem } from '@csl/contracts';
import { RssNewsProvider } from './rss-news.provider';

describe('RssNewsProvider', () => {
  let provider: RssNewsProvider;
  let mockConfigService: Partial<ConfigService>;
  let originalFetch: typeof globalThis.fetch;

  const sampleRssXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>CoinDesk News</title>
    <link>https://www.coindesk.com</link>
    <description>Latest cryptocurrency news and analysis</description>
    <item>
      <title><![CDATA[Bitcoin &amp; Ethereum Rally Past Key Milestones]]></title>
      <link>https://www.coindesk.com/markets/bitcoin-ethereum-rally</link>
      <guid isPermaLink="true">https://www.coindesk.com/markets/bitcoin-ethereum-rally</guid>
      <pubDate>Fri, 21 Feb 2025 08:30:00 GMT</pubDate>
      <category><![CDATA[Markets]]></category>
      <category><![CDATA[Bitcoin]]></category>
      <category><![CDATA[ETH]]></category>
      <description><![CDATA[<p>Bitcoin has crossed resistance while Ethereum Layer-2 activity spikes.</p>]]></description>
      <content:encoded><![CDATA[<p>Full article body about Bitcoin and Ethereum market movements &gt; previous highs.</p>]]></content:encoded>
    </item>
    <item>
      <title>Solana DEX Volume Hits Record High</title>
      <link>https://www.coindesk.com/markets/solana-dex-volume</link>
      <guid>https://www.coindesk.com/markets/solana-dex-volume</guid>
      <pubDate>Fri, 21 Feb 2025 09:45:00 GMT</pubDate>
      <category>DeFi</category>
      <category>SOL</category>
      <description>Solana ecosystem decentralized exchange volume reached unprecedented numbers today.</description>
    </item>
  </channel>
</rss>`;

  const sampleAtomXml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>CoinTelegraph Atom</title>
  <link href="https://cointelegraph.com" rel="alternate" />
  <entry>
    <title>Ripple Wins Key Regulatory Ruling in Court</title>
    <link href="https://cointelegraph.com/news/ripple-xrp-ruling" />
    <id>urn:uuid:12345-67890</id>
    <published>2025-02-21T10:15:00Z</published>
    <updated>2025-02-21T10:15:00Z</updated>
    <summary>XRP price surges following positive legal developments for Ripple Labs.</summary>
    <content type="html"><![CDATA[<div>Full details about Ripple (XRP) court ruling and market reactions.</div>]]></content>
    <category term="XRP" />
    <category term="Legal" />
  </entry>
</feed>`;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'RSS_NEWS_FEEDS') {
          return defaultValue ?? 'https://www.coindesk.com/arc/outboundfeeds/rss/';
        }
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };
    provider = new RssNewsProvider(mockConfigService as ConfigService);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should have provider name "RSS"', () => {
    expect(provider.name).toBe('RSS');
  });

  it('should fetch and parse standard RSS 2.0 feeds with CDATA and HTML entity decoding', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sampleRssXml),
    });

    const beforeCrawl = Date.now();
    const items = await provider.fetchNews();
    const afterCrawl = Date.now();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(items).toHaveLength(2);

    // Item 1 verification
    const first = items[0];
    expect(first.title).toBe('Bitcoin & Ethereum Rally Past Key Milestones');
    expect(first.url).toBe('https://www.coindesk.com/markets/bitcoin-ethereum-rally');
    expect(first.source).toBe('CoinDesk News');
    expect(first.publishedAt).toBe(new Date('Fri, 21 Feb 2025 08:30:00 GMT').getTime());
    expect(first.crawledAt).toBeGreaterThanOrEqual(beforeCrawl);
    expect(first.crawledAt).toBeLessThanOrEqual(afterCrawl);
    expect(first.content).toContain('Bitcoin has crossed resistance');
    expect(first.content).not.toContain('<p>');
    expect(first.relatedCoins).toEqual(expect.arrayContaining(['BTC', 'ETH', 'MARKETS']));

    // Item 2 verification
    const second = items[1];
    expect(second.title).toBe('Solana DEX Volume Hits Record High');
    expect(second.url).toBe('https://www.coindesk.com/markets/solana-dex-volume');
    expect(second.source).toBe('CoinDesk News');
    expect(second.publishedAt).toBe(new Date('Fri, 21 Feb 2025 09:45:00 GMT').getTime());
    expect(second.relatedCoins).toEqual(expect.arrayContaining(['SOL', 'DEFI']));
  });

  it('should parse Atom feeds (<feed><entry>) correctly', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sampleAtomXml),
    });

    const items = await provider.fetchNews();

    expect(items).toHaveLength(1);
    const item = items[0];
    expect(item.title).toBe('Ripple Wins Key Regulatory Ruling in Court');
    expect(item.url).toBe('https://cointelegraph.com/news/ripple-xrp-ruling');
    expect(item.source).toBe('CoinTelegraph Atom');
    expect(item.publishedAt).toBe(new Date('2025-02-21T10:15:00Z').getTime());
    expect(item.content).toContain('XRP price surges');
    expect(item.content).not.toContain('<div>');
    expect(item.relatedCoins).toEqual(expect.arrayContaining(['XRP', 'LEGAL']));
  });

  it('should fetch from multiple configured RSS feed URLs and combine them', async () => {
    const multiFeedConfig = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'RSS_NEWS_FEEDS') {
          return 'https://feed1.example.com/rss, https://feed2.example.com/atom';
        }
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };
    const multiProvider = new RssNewsProvider(multiFeedConfig as ConfigService);

    globalThis.fetch = jest.fn().mockImplementation(async (input: unknown) => {
      const urlStr = String(input);
      if (urlStr.includes('feed1')) {
        return { ok: true, text: async () => sampleRssXml };
      }
      if (urlStr.includes('feed2')) {
        return { ok: true, text: async () => sampleAtomXml };
      }
      return { ok: false, status: 404 };
    });

    const items = await multiProvider.fetchNews();

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
    // 2 from RSS + 1 from Atom = 3 total items
    expect(items).toHaveLength(3);
    const titles = items.map((i: Omit<NewsItem, 'id'>) => i.title);
    expect(titles).toContain('Bitcoin & Ethereum Rally Past Key Milestones');
    expect(titles).toContain('Solana DEX Volume Hits Record High');
    expect(titles).toContain('Ripple Wins Key Regulatory Ruling in Court');
  });

  it('should tolerate partial feed failures and return results from working feeds', async () => {
    const multiFeedConfig = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'RSS_NEWS_FEEDS') {
          return 'https://failing-feed.com/rss, https://healthy-feed.com/rss';
        }
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };
    const multiProvider = new RssNewsProvider(multiFeedConfig as ConfigService);

    globalThis.fetch = jest.fn().mockImplementation(async (input: unknown) => {
      const urlStr = String(input);
      if (urlStr.includes('failing')) {
        return { ok: false, status: 500, statusText: 'Internal Server Error' };
      }
      return { ok: true, text: async () => sampleRssXml };
    });

    const items = await multiProvider.fetchNews();

    expect(items).toHaveLength(2);
    expect(items[0].title).toBe('Bitcoin & Ethereum Rally Past Key Milestones');
  });

  it('should return empty array if all feeds fail', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
    });

    const items = await provider.fetchNews();
    expect(items).toEqual([]);
  });

  it('should extract coin tickers and coin name mentions (Bitcoin->BTC, Ethereum->ETH, Cardano->ADA, Dogecoin->DOGE)', async () => {
    const coinMentionXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Crypto News Daily</title>
    <item>
      <title>Cardano and Dogecoin Join Market Surge</title>
      <link>https://example.com/ada-doge</link>
      <pubDate>Fri, 21 Feb 2025 11:00:00 GMT</pubDate>
      <description>Both Avalanche (AVAX) and Binance Coin (BNB) also saw double digit gains.</description>
    </item>
  </channel>
</rss>`;

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(coinMentionXml),
    });

    const items = await provider.fetchNews();
    expect(items).toHaveLength(1);
    expect(items[0].relatedCoins).toEqual(
      expect.arrayContaining(['ADA', 'DOGE', 'AVAX', 'BNB']),
    );
  });

  it('should filter items by from and to timestamps', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sampleRssXml),
    });

    // Item 1: 08:30 GMT (1740126600000)
    // Item 2: 09:45 GMT (1740131100000)
    const fromTime = new Date('Fri, 21 Feb 2025 09:00:00 GMT').getTime();
    const toTime = new Date('Fri, 21 Feb 2025 10:00:00 GMT').getTime();

    const filtered = await provider.fetchNews({
      from: fromTime,
      to: toTime,
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Solana DEX Volume Hits Record High');
  });

  it('should filter items by coin symbol when coins option is passed', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sampleRssXml),
    });

    const btcItems = await provider.fetchNews({ coins: ['BTC'] });
    expect(btcItems).toHaveLength(1);
    expect(btcItems[0].title).toBe('Bitcoin & Ethereum Rally Past Key Milestones');

    const solItems = await provider.fetchNews({ coins: ['SOL'] });
    expect(solItems).toHaveLength(1);
    expect(solItems[0].title).toBe('Solana DEX Volume Hits Record High');
  });

  it('should respect limit option', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(sampleRssXml),
    });

    const limited = await provider.fetchNews({ limit: 1 });
    expect(limited).toHaveLength(1);
  });

  it('should handle malformed or empty XML gracefully', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue('<invalid-xml>none</invalid-xml>'),
    });

    const items = await provider.fetchNews();
    expect(items).toEqual([]);
  });

  it('should handle missing link and missing pubDate with fallbacks', async () => {
    const incompleteXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Incomplete Feed</title>
    <item>
      <title>Article Without Link Or Date</title>
      <description>Some description text here.</description>
    </item>
  </channel>
</rss>`;

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      text: jest.fn().mockResolvedValue(incompleteXml),
    });

    const before = Date.now();
    const items = await provider.fetchNews();
    const after = Date.now();

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe('Article Without Link Or Date');
    expect(items[0].url).toBe('');
    expect(items[0].publishedAt).toBeGreaterThanOrEqual(before);
    expect(items[0].publishedAt).toBeLessThanOrEqual(after);
    expect(items[0].source).toBe('Incomplete Feed');
  });
});
