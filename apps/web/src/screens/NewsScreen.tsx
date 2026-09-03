import { useCallback, useEffect, useState } from 'react';
import type { NewsItem } from '@csl/contracts';
import { apiFetch } from '../api/request';
import { Header } from '../layout/Header';
import { buildCollectNewsPayload, buildNewsQuery, validateDateRange } from '../news/news-request';
import { NewsControls } from '../news/NewsControls';
import { NewsFeed } from '../news/NewsFeed';
import { SentimentDistribution, type SentimentStats } from '../news/SentimentDistribution';

export function NewsScreen() {
  const [coin, setCoin] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [limit, setLimit] = useState(20);
  const [items, setItems] = useState<NewsItem[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<SentimentStats | null>(null);

  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchNews = useCallback(() => {
    // A backwards range is the filter refusing, not the feed failing — it belongs beside
    // the controls that caused it, and must not claim the articles could not be loaded.
    const dateError = validateDateRange(fromDate, toDate);
    setFilterError(dateError);
    if (dateError) {
      setIsLoadingNews(false);
      return;
    }

    setIsLoadingNews(true);
    setNewsError(null);

    const params = buildNewsQuery({ coin, source, fromDate, toDate });

    apiFetch<{ items: NewsItem[]; total: number }>(`/api/news?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setTotal(data.total);
        setIsLoadingNews(false);
      })
      .catch((err: Error) => {
        setNewsError(err.message);
        setIsLoadingNews(false);
      });
  }, [coin, source, fromDate, toDate]);

  const fetchStats = useCallback(() => {
    setIsLoadingStats(true);
    setStatsError(null);

    const params = new URLSearchParams();
    if (coin !== 'ALL') params.append('coin', coin);

    apiFetch<SentimentStats>(`/api/sentiment/stats?${params.toString()}`)
      .then((data) => {
        setStats(data);
        setIsLoadingStats(false);
      })
      .catch((err: Error) => {
        setStatsError(err.message);
        setIsLoadingStats(false);
      });
  }, [coin]);

  useEffect(() => {
    fetchNews();
    fetchStats();
  }, [fetchNews, fetchStats]);

  const handleCollect = () => {
    setIsCollecting(true);
    setNewsError(null);
    setFeedback(null);
    // No date range: collecting asks the providers for their newest articles, and the
    // range the reader picked is a filter over what is already stored.
    const body = buildCollectNewsPayload({ coin, source, limit });

    apiFetch<{ collected: number; inserted: number }>('/api/news/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => {
        setIsCollecting(false);
        if (res.inserted > 0) {
          setFeedback(`Đã thu thập ${res.collected} bài viết (thêm mới ${res.inserted} bài).`);
        } else {
          setFeedback(`Đã thu thập ${res.collected} bài viết (không có bài viết mới).`);
        }
        fetchNews();
        fetchStats();
      })
      .catch((err: Error) => {
        setIsCollecting(false);
        setNewsError(err.message);
      });
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setStatsError(null);
    setFeedback(null);
    apiFetch<{ processed: number; updated: number; failed?: number }>('/api/sentiment/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    })
      .then((res) => {
        setIsAnalyzing(false);
        if (res.processed === 0) {
          setFeedback('Không có bài viết nào cần chấm điểm.');
        } else if (res.failed && res.failed > 0) {
          setFeedback(
            `Đã phân tích ${res.processed} bài viết: chấm điểm thành công ${res.updated}, thất bại ${res.failed}.`,
          );
        } else {
          setFeedback(`Đã chấm điểm thành công ${res.updated} / ${res.processed} bài viết.`);
        }
        fetchNews();
        fetchStats();
      })
      .catch((err: Error) => {
        setIsAnalyzing(false);
        setStatsError(err.message);
      });
  };

  return (
    <main className="screen">
      <Header
        title="Thu thập tin tức & Phân tích Sentiment"
        subtitle="Thu thập tin tức và theo dõi phân bố sentiment theo coin."
      />

      <div className="screen-body">
        <div className="screen-main">
          <NewsControls
            coin={coin}
            onCoinChange={setCoin}
            source={source}
            onSourceChange={setSource}
            fromDate={fromDate}
            onFromDateChange={setFromDate}
            toDate={toDate}
            onToDateChange={setToDate}
            limit={limit}
            onLimitChange={setLimit}
            onCollect={handleCollect}
            onAnalyze={handleAnalyze}
            isCollecting={isCollecting}
            isAnalyzing={isAnalyzing}
            feedback={feedback}
            filterError={filterError}
          />

          <NewsFeed
            items={items}
            total={total}
            isLoading={isLoadingNews}
            error={newsError}
            onRetry={fetchNews}
            onCollectPrompt={handleCollect}
            isCollecting={isCollecting}
          />
        </div>

        <div className="screen-side">
          <SentimentDistribution
            coin={coin}
            stats={stats}
            isLoading={isLoadingStats}
            error={statsError}
            onRetry={fetchStats}
          />

        </div>
      </div>
    </main>
  );
}
