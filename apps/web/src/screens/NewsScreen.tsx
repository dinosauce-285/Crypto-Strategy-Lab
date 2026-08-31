import { useCallback, useEffect, useState } from 'react';
import type { NewsItem } from '@csl/contracts';
import { apiFetch } from '../api/request';
import { Header } from '../layout/Header';
import { NewsControls } from '../news/NewsControls';
import { NewsFeed } from '../news/NewsFeed';
import { SentimentDistribution, type SentimentStats } from '../news/SentimentDistribution';

export function NewsScreen() {
  const [coin, setCoin] = useState('ALL');
  const [source, setSource] = useState('ALL');
  const [items, setItems] = useState<NewsItem[]>([]);
  const [stats, setStats] = useState<SentimentStats | null>(null);

  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isCollecting, setIsCollecting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchNews = useCallback(() => {
    setIsLoadingNews(true);
    setNewsError(null);

    const params = new URLSearchParams({ limit: '50' });
    if (coin !== 'ALL') params.append('coin', coin);

    apiFetch<{ items: NewsItem[]; total: number }>(`/api/news?${params.toString()}`)
      .then((data) => {
        let list = data.items;
        if (source !== 'ALL') {
          list = list.filter((item) =>
            item.source.toLowerCase().includes(source.toLowerCase()),
          );
        }
        setItems(list);
        setIsLoadingNews(false);
      })
      .catch((err: Error) => {
        setNewsError(err.message);
        setIsLoadingNews(false);
      });
  }, [coin, source]);

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
    const body: { coins?: string[]; limit?: number; source?: string } = { limit: 20 };
    if (coin !== 'ALL') body.coins = [coin];
    if (source !== 'ALL') body.source = source;

    apiFetch('/api/news/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then(() => {
        setIsCollecting(false);
        fetchNews();
        fetchStats();
      })
      .catch((err: Error) => {
        setIsCollecting(false);
        alert(`Thu thập tin tức thất bại: ${err.message}`);
      });
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    apiFetch('/api/sentiment/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    })
      .then(() => {
        setIsAnalyzing(false);
        fetchNews();
        fetchStats();
      })
      .catch((err: Error) => {
        setIsAnalyzing(false);
        alert(`Phân tích sentiment thất bại: ${err.message}`);
      });
  };

  return (
    <main className="screen">
      <Header title="Thu thập tin tức & Phân tích Sentiment" />

      <div className="screen-body">
        <div className="screen-main">
          <NewsControls
            coin={coin}
            onCoinChange={setCoin}
            source={source}
            onSourceChange={setSource}
            onCollect={handleCollect}
            onAnalyze={handleAnalyze}
            isCollecting={isCollecting}
            isAnalyzing={isAnalyzing}
          />

          <NewsFeed
            items={items}
            isLoading={isLoadingNews}
            error={newsError}
            onRetry={fetchNews}
            onCollectPrompt={handleCollect}
          />
        </div>

        <div className="screen-side">
          <SentimentDistribution
            coin={coin}
            stats={stats}
            isLoading={isLoadingStats}
            error={statsError}
          />

        </div>
      </div>
    </main>
  );
}
