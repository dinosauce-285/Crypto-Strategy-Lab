# News collector sits behind a multi-provider port and decouples sentiment via the event bus

## Why this

The news subsystem must ingest market-moving articles across diverse sources—ranging from structured REST endpoints (CryptoCompare) to semi-structured syndicated feeds (CoinDesk, Cointelegraph RSS)—while satisfying two core architectural mandates: zero direct coupling to machine learning models (brief section 44) and zero ripple effect when adding new news sources (brief section 40).

Putting news sources behind an abstract `NewsProviderPort` isolates provider-specific transport, schema parsing, rate-limiting, and error handling from the rest of the application. Adding an RSS feed or exchange news stream requires only implementing one new provider class and registering it in `NewsModule`, without touching ingestion or storage logic.

Section 44 explicitly forbids the crawler from calling the sentiment model directly ("Crawler welded to ML" anti-pattern). Instead, `NewsService` coordinates providers, persists raw normalized articles through `NewsRepository` into PostgreSQL with deduplication on article URL, and emits `EVENTS.NewsCollected` (`news.collected`) over the in-process event bus (`EventEmitter2`, ADR 0003). Downstream sentiment analysis (T23) subscribes to this event independently, keeping the blast radius strictly partitioned: a failure or slowdown in sentiment classification cannot stall news ingestion or corrupt market data ingestion pipelines.

Database-level deduplication via unique constraints on `url` (ADR 0016) guarantees idempotency during scheduled crawls and backfill operations without requiring error-prone in-memory set tracking across restarts.

## What else we looked at

**Direct synchronous sentiment scoring inside the crawler** — the simplest end-to-end flow. Rejected because it directly violates section 44 and fails the isolation questions in section 40: if the sentiment model API (Groq) throttles or goes down, news collection halts; if sentiment classification is slow, crawl throughput collapses.

**Single hardcoded provider without an abstraction port** — fetching news solely from CryptoCompare REST API. Rejected because crypto news is fragmented across proprietary feeds and independent editorial RSS sources. A hardcoded implementation couples the service to one vendor's payload format and makes adding fallback sources require modifying the service core.

**Heavy asynchronous message queue (BullMQ/RabbitMQ) for ingestion** — using dedicated background workers for every fetched article. BullMQ is already reserved for heavy backtesting compute workloads (ADR 0004). News collection is periodic I/O batch ingestion; adding message broker infrastructure here adds operational complexity without benefit, whereas the in-process event bus provides adequate decoupling with zero overhead.

**In-memory deduplication cache** — tracking seen URLs in a memory set or Redis cache before inserting. Rejected because it does not survive process restarts, cannot guarantee atomicity across multiple concurrent crawler runs, and duplicates state that PostgreSQL already enforces natively with its unique index on `News.url`.

## Trade-offs

Sentiment scoring is eventually consistent rather than immediately available on ingest. Articles are initially stored unscored (`sentiment: null`), and sentiment is attached asynchronously when the event consumer completes classification. Queries requesting immediate news after a crawl may observe unscored records for a brief window.

Normalizing diverse providers into the shared `NewsItem` schema (`id`, `title`, `content`, `source`, `publishedAt`, `crawledAt`, `relatedCoins`, `url`) forces a lowest-common-denominator representation. Source-specific metadata fields not captured by the schema (such as custom provider categories or raw author objects) are discarded.

Multi-provider coordination increases variance in crawl execution times. Because RSS feeds and REST APIs have different latency profiles and rate limits, `NewsService` must tolerate individual provider timeouts and partial failures gracefully so that one failing feed does not prevent other providers from persisting their collected articles.
