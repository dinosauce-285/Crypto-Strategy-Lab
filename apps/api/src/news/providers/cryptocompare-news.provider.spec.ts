import { ConfigService } from '@nestjs/config';
import { CryptoCompareNewsProvider } from './cryptocompare-news.provider';

describe('CryptoCompareNewsProvider', () => {
  let provider: CryptoCompareNewsProvider;
  let mockConfigService: Partial<ConfigService>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'CRYPTOCOMPARE_NEWS_URL') return defaultValue ?? 'https://min-api.cryptocompare.com/data/v2/news/?lang=EN';
        if (key === 'CRYPTOCOMPARE_API_KEY') return undefined;
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };
    provider = new CryptoCompareNewsProvider(mockConfigService as ConfigService);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should have provider name "CryptoCompare"', () => {
    expect(provider.name).toBe('CryptoCompare');
  });

  it('should fetch news and normalize CryptoCompare payload correctly', async () => {
    const mockApiResponse = {
      Type: 100,
      Message: 'News list successfully returned',
      Data: [
        {
          id: '7082300',
          guid: 'https://cointelegraph.com/news/bitcoin-surge',
          published_on: 1740118800, // 2025-02-21T06:20:00Z in seconds
          imageurl: 'https://images.cryptocompare.com/news/1.jpg',
          title: 'Bitcoin Surges Past Key Resistance Level',
          url: 'https://cointelegraph.com/news/bitcoin-surge',
          body: 'Bitcoin price broke through a critical resistance zone today...',
          tags: 'BTC|Trading|Market',
          categories: 'BTC|ETH|MARKET',
          source_info: {
            name: 'CoinTelegraph',
            lang: 'EN',
            img: 'https://images.cryptocompare.com/news/cointelegraph.png',
          },
          source: 'cointelegraph',
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockApiResponse),
    });

    const beforeCrawl = Date.now();
    const result = await provider.fetchNews();
    const afterCrawl = Date.now();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      title: 'Bitcoin Surges Past Key Resistance Level',
      content: 'Bitcoin price broke through a critical resistance zone today...',
      source: 'CoinTelegraph',
      url: 'https://cointelegraph.com/news/bitcoin-surge',
      publishedAt: 1740118800000,
      crawledAt: expect.any(Number),
      relatedCoins: expect.arrayContaining(['BTC', 'ETH', 'MARKET', 'TRADING']),
    });
    expect(result[0].crawledAt).toBeGreaterThanOrEqual(beforeCrawl);
    expect(result[0].crawledAt).toBeLessThanOrEqual(afterCrawl);
  });

  it('should query categories and lTs when options are passed', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ Type: 100, Data: [] }),
    });
    globalThis.fetch = mockFetch;

    const toTimeMs = 1740118800000;
    await provider.fetchNews({
      coins: ['BTC', 'ETH'],
      to: toTimeMs,
      limit: 10,
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('categories=BTC%2CETH');
    expect(calledUrl).toContain('lTs=1740118800');
  });

  it('should attach Authorization header if CRYPTOCOMPARE_API_KEY is configured', async () => {
    const configWithKey = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'CRYPTOCOMPARE_API_KEY') return 'test-api-key-123';
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };
    const providerWithKey = new CryptoCompareNewsProvider(configWithKey as ConfigService);

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ Type: 100, Data: [] }),
    });
    globalThis.fetch = mockFetch;

    await providerWithKey.fetchNews();

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Apikey test-api-key-123',
        }),
      }),
    );
  });

  it('should filter by from/to timestamps and limit results', async () => {
    const mockApiResponse = {
      Type: 100,
      Data: [
        {
          id: '1',
          published_on: 1000,
          title: 'News 1',
          body: 'Content 1',
          url: 'https://example.com/1',
          categories: 'BTC',
        },
        {
          id: '2',
          published_on: 2000,
          title: 'News 2',
          body: 'Content 2',
          url: 'https://example.com/2',
          categories: 'ETH',
        },
        {
          id: '3',
          published_on: 3000,
          title: 'News 3',
          body: 'Content 3',
          url: 'https://example.com/3',
          categories: 'SOL',
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockApiResponse),
    });

    const result = await provider.fetchNews({
      from: 1500000, // 1500s -> only items 2 and 3 match (2000s, 3000s)
      to: 2500000,   // 2500s -> only item 2 matches (2000s)
      limit: 5,
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('News 2');
  });

  it('should filter by coins if specified in options', async () => {
    const mockApiResponse = {
      Type: 100,
      Data: [
        {
          id: '1',
          published_on: 1000,
          title: 'BTC News',
          body: 'BTC Content',
          url: 'https://example.com/1',
          categories: 'BTC|BLOCKCHAIN',
        },
        {
          id: '2',
          published_on: 2000,
          title: 'SOL News',
          body: 'SOL Content',
          url: 'https://example.com/2',
          categories: 'SOL|DEFI',
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockApiResponse),
    });

    const result = await provider.fetchNews({
      coins: ['BTC'],
    });

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('BTC News');
  });

  it('should fallback gracefully when source_info is omitted or categories are empty', async () => {
    const mockApiResponse = {
      Type: 100,
      Data: [
        {
          id: '1',
          published_on: 1000,
          title: 'Fallback News',
          body: 'Fallback Content',
          url: 'https://example.com/fallback',
          source: 'coindesk',
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockApiResponse),
    });

    const result = await provider.fetchNews();

    expect(result[0].source).toBe('coindesk');
    expect(result[0].relatedCoins).toEqual([]);
  });

  it('should return empty array if Data is missing or not an array', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ Type: 100, Data: null }),
    });

    const result = await provider.fetchNews();
    expect(result).toEqual([]);
  });

  it('should throw an error when HTTP response is not ok', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(provider.fetchNews()).rejects.toThrow('CryptoCompare news request failed: HTTP 429');
  });

  it('should throw an error when CryptoCompare returns an error response object', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        Response: 'Error',
        Message: 'Rate limit exceeded',
        Type: 1,
      }),
    });

    await expect(provider.fetchNews()).rejects.toThrow('CryptoCompare news error: Rate limit exceeded');
  });
});
