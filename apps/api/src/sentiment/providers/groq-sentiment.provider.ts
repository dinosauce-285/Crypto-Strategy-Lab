import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Sentiment, SentimentLabel } from '@csl/contracts';
import { SentimentProviderPort } from '../ports/sentiment-provider.port';

const DEFAULT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

interface GroqChatCompletionResponse {
  id?: string;
  choices?: Array<{
    index?: number;
    message?: {
      role?: string;
      content?: string;
    };
    finish_reason?: string;
  }>;
}

@Injectable()
export class GroqSentimentProvider extends SentimentProviderPort {
  readonly name = 'Groq';
  private readonly logger = new Logger(GroqSentimentProvider.name);

  constructor(@Optional() private readonly config?: ConfigService) {
    super();
  }

  async analyze(text: string): Promise<Sentiment> {
    const apiKey = this.config?.get<string>('GROQ_API_KEY') || process.env.GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('Groq API key is not configured');
    }

    const apiUrl =
      this.config?.get<string>('GROQ_API_URL', DEFAULT_GROQ_URL) ?? DEFAULT_GROQ_URL;
    const model =
      this.config?.get<string>('GROQ_MODEL', DEFAULT_GROQ_MODEL) ?? DEFAULT_GROQ_MODEL;

    const systemPrompt =
      'You are a crypto market sentiment analyzer. Analyze the provided news text and classify its sentiment as POSITIVE, NEUTRAL, or NEGATIVE, along with a numeric sentiment score strictly between -1.0 (extremely bearish/negative) and 1.0 (extremely bullish/positive). Respond ONLY with valid JSON in this exact format: {"label": "POSITIVE" | "NEUTRAL" | "NEGATIVE", "score": <number between -1.0 and 1.0>}.';

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: text },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq sentiment analysis failed: HTTP ${response.status}`);
    }

    const json = (await response.json()) as GroqChatCompletionResponse;
    const choice = json.choices?.[0];
    if (!choice || !choice.message?.content) {
      throw new Error('Groq response did not return any choices or message content');
    }

    let rawContent = choice.message.content.trim();
    if (rawContent.startsWith('```')) {
      rawContent = rawContent
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
    }

    let parsed: { label?: string; score?: number };
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      throw new Error(`Failed to parse Groq sentiment JSON: ${(err as Error).message}`);
    }

    const rawScore = typeof parsed.score === 'number' ? parsed.score : Number(parsed.score);
    if (isNaN(rawScore)) {
      throw new Error('Invalid score in Groq sentiment response');
    }

    const clampedScore = Math.max(-1.0, Math.min(1.0, rawScore));
    const score = Math.round(clampedScore * 10000) / 10000;

    let label: SentimentLabel;
    const normalizedLabel =
      typeof parsed.label === 'string' ? parsed.label.trim().toUpperCase() : '';

    if (
      normalizedLabel === 'POSITIVE' ||
      normalizedLabel === 'NEGATIVE' ||
      normalizedLabel === 'NEUTRAL'
    ) {
      label = normalizedLabel;
    } else {
      if (score > 0.05) {
        label = 'POSITIVE';
      } else if (score < -0.05) {
        label = 'NEGATIVE';
      } else {
        label = 'NEUTRAL';
      }
    }

    return { label, score };
  }
}
