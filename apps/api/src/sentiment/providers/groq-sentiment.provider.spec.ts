import { ConfigService } from '@nestjs/config';
import { GroqSentimentProvider } from './groq-sentiment.provider';

describe('GroqSentimentProvider', () => {
  let provider: GroqSentimentProvider;
  let mockConfigService: Partial<ConfigService>;
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'GROQ_API_KEY') return 'test-groq-api-key';
        if (key === 'GROQ_MODEL') return defaultValue ?? 'llama-3.3-70b-versatile';
        if (key === 'GROQ_API_URL') return defaultValue ?? 'https://api.groq.com/openai/v1/chat/completions';
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };
    provider = new GroqSentimentProvider(mockConfigService as ConfigService);
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it('should have provider name "Groq"', () => {
    expect(provider.name).toBe('Groq');
  });

  it('should analyze positive sentiment correctly via Groq API', async () => {
    const mockGroqResponse = {
      id: 'chatcmpl-123',
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ label: 'POSITIVE', score: 0.85 }),
          },
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponse),
    });

    const result = await provider.analyze('Bitcoin hits new all-time high with institutional inflows');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'https://api.groq.com/openai/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-groq-api-key',
        },
        body: expect.stringContaining('llama-3.3-70b-versatile'),
      }),
    );

    expect(result).toEqual({
      label: 'POSITIVE',
      score: 0.85,
    });
  });

  it('should analyze negative sentiment correctly via Groq API', async () => {
    const mockGroqResponse = {
      id: 'chatcmpl-456',
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ label: 'NEGATIVE', score: -0.75 }),
          },
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponse),
    });

    const result = await provider.analyze('Crypto exchange hacked, millions lost in security breach');

    expect(result).toEqual({
      label: 'NEGATIVE',
      score: -0.75,
    });
  });

  it('should analyze neutral sentiment correctly via Groq API', async () => {
    const mockGroqResponse = {
      id: 'chatcmpl-789',
      choices: [
        {
          message: {
            role: 'assistant',
            content: JSON.stringify({ label: 'NEUTRAL', score: 0.0 }),
          },
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponse),
    });

    const result = await provider.analyze('Federal Reserve scheduled routine FOMC meeting for next month');

    expect(result).toEqual({
      label: 'NEUTRAL',
      score: 0.0,
    });
  });

  it('should clamp scores strictly between -1.0 and 1.0', async () => {
    const mockGroqResponseOver = {
      choices: [{ message: { content: JSON.stringify({ label: 'POSITIVE', score: 1.8 }) } }],
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponseOver),
    });

    const resultOver = await provider.analyze('Extreme bull market');
    expect(resultOver.score).toBe(1.0);

    const mockGroqResponseUnder = {
      choices: [{ message: { content: JSON.stringify({ label: 'NEGATIVE', score: -2.5 }) } }],
    };
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponseUnder),
    });

    const resultUnder = await provider.analyze('Extreme market crash');
    expect(resultUnder.score).toBe(-1.0);
  });

  it('should handle markdown fenced JSON responses and normalize lowercase labels', async () => {
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: '```json\n{\n  "label": "positive",\n  "score": 0.65\n}\n```',
          },
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponse),
    });

    const result = await provider.analyze('Solana ecosystem activity accelerates');
    expect(result).toEqual({
      label: 'POSITIVE',
      score: 0.65,
    });
  });

  it('should derive label from score when label is invalid or missing', async () => {
    const mockGroqResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({ score: -0.6 }),
          },
        },
      ],
    };

    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponse),
    });

    const result = await provider.analyze('Bear market fears return');
    expect(result).toEqual({
      label: 'NEGATIVE',
      score: -0.6,
    });
  });

  it('should throw an error when GROQ_API_KEY is not configured', async () => {
    const unconfigured = new GroqSentimentProvider({
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as ConfigService);

    await expect(unconfigured.analyze('Some news')).rejects.toThrow(
      'Groq API key is not configured',
    );
  });

  it('should throw an error when Groq API HTTP response is not ok', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
    });

    await expect(provider.analyze('Some news')).rejects.toThrow(
      'Groq sentiment analysis failed: HTTP 429',
    );
  });

  it('should throw an error when Groq response does not contain choices or valid content', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ choices: [] }),
    });

    await expect(provider.analyze('Some news')).rejects.toThrow(
      'Groq response did not return any choices',
    );
  });

  it('should throw an error when model returns unparseable content', async () => {
    globalThis.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'Sorry, I cannot analyze this' } }],
      }),
    });

    await expect(provider.analyze('Some news')).rejects.toThrow(
      /Failed to parse Groq sentiment JSON/,
    );
  });

  it('should support custom GROQ_MODEL and custom GROQ_API_URL', async () => {
    const customConfig = {
      get: jest.fn((key: string, defaultValue?: unknown) => {
        if (key === 'GROQ_API_KEY') return 'custom-key';
        if (key === 'GROQ_MODEL') return 'llama-3.1-8b-instant';
        if (key === 'GROQ_API_URL') return 'https://custom.groq.internal/v1/chat/completions';
        return defaultValue;
      }) as unknown as ConfigService['get'],
    };

    const customProvider = new GroqSentimentProvider(customConfig as ConfigService);

    const mockGroqResponse = {
      choices: [{ message: { content: JSON.stringify({ label: 'NEUTRAL', score: 0.05 }) } }],
    };

    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(mockGroqResponse),
    });
    globalThis.fetch = mockFetch;

    await customProvider.analyze('Market consolidation');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://custom.groq.internal/v1/chat/completions',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer custom-key',
        }),
        body: expect.stringContaining('llama-3.1-8b-instant'),
      }),
    );
  });
});
