import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, type Candle, type DataRequest, type StrategyParams } from '@csl/contracts';
import { IndicatorPort } from './ports/indicator.port';
import { buildCalculatorRegistry } from './calculators/calculator';
import { movingAverageCalculator } from './calculators/moving-average.calculator';
import { rsiCalculator } from './calculators/rsi.calculator';
import { bollingerBandsCalculator } from './calculators/bollinger-bands.calculator';
import { macdCalculator } from './calculators/macd.calculator';
import { supportResistanceCalculator } from './calculators/support-resistance.calculator';
import { sentimentCalculator, type ScoredArticle } from './calculators/sentiment.calculator';
import { IndicatorRepository } from './indicator.repository';

const DEFAULT_FIELD = 'value';

/**
 * The two callers ADR 0008 names — the backtest engine's `StrategyContext` and, later,
 * a chart endpoint — both resolve through `IndicatorPort`, never this class directly.
 *
 * Cached in memory per process, keyed by `(datasetId, indicator name, params)` (ADR
 * 0028): a fifth indicator is one calculator plus one registry line, and a
 * multi-series indicator's fields share one cache entry and one computed pass.
 */
@Injectable()
export class IndicatorService extends IndicatorPort implements OnModuleInit {
  private readonly logger = new Logger(IndicatorService.name);
  private readonly sentimentCalculator = sentimentCalculator;

  private readonly registry = buildCalculatorRegistry([
    movingAverageCalculator,
    rsiCalculator,
    bollingerBandsCalculator,
    macdCalculator,
    supportResistanceCalculator,
    this.sentimentCalculator,
  ]);

  private readonly cache = new Map<string, Record<string, number[]>>();

  constructor(private readonly repository?: IndicatorRepository) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.refreshArticles();
  }

  @OnEvent(EVENTS.SentimentAnalyzed)
  async onSentimentAnalyzed(): Promise<void> {
    await this.refreshArticles();
  }

  async refreshArticles(): Promise<void> {
    if (this.repository) {
      try {
        const articles = await this.repository.findScoredArticles();
        this.setArticles(articles);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`Failed to load scored articles: ${message}`);
      }
    }
  }

  setArticles(articles: readonly ScoredArticle[]): void {
    this.sentimentCalculator.setArticles(articles);
    this.cache.clear();
  }

  compute(datasetId: string, candles: readonly Candle[], request: DataRequest): readonly number[] {
    const [name, field = DEFAULT_FIELD] = request.source.split('.');
    const calculator = this.registry.get(name);
    if (!calculator) {
      throw new Error(`No indicator registered for source "${request.source}"`);
    }

    const cacheKey = this.cacheKey(datasetId, name, request.params);
    let result = this.cache.get(cacheKey);
    if (!result) {
      result = calculator.compute(candles, request.params);
      this.cache.set(cacheKey, result);
    }

    const series = result[field];
    if (!series) {
      throw new Error(`Indicator "${name}" has no field "${field}" (source "${request.source}")`);
    }
    return series;
  }

  private cacheKey(datasetId: string, name: string, params: StrategyParams): string {
    return `${datasetId}::${name}::${stableParamsKey(params)}`;
  }
}

function stableParamsKey(params: StrategyParams): string {
  const sortedKeys = Object.keys(params).sort();
  return JSON.stringify(sortedKeys.map((key) => [key, params[key]]));
}
