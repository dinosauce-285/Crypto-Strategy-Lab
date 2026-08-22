import { useCallback, useEffect, useState } from 'react';
import type { NewsItem } from '@csl/contracts';
import { Header } from '../layout/Header';
import { NewsControls } from '../news/NewsControls';
import { NewsFeed } from '../news/NewsFeed';
import { SentimentDistribution, type SentimentStats } from '../news/SentimentDistribution';
import { StrategyIntegrationCard } from '../news/StrategyIntegrationCard';

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

    fetch(`/api/news?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: { items: NewsItem[]; total: number }) => {
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

    fetch(`/api/sentiment/stats?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then((data: SentimentStats) => {
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

    fetch('/api/news/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(() => {
        setIsCollecting(false);
        fetchNews();
        fetchStats();
      })
      .catch((err: Error) => {
        setIsCollecting(false);
        alert(`Collect failed: ${err.message}`);
      });
  };

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    fetch('/api/sentiment/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 50 }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(() => {
        setIsAnalyzing(false);
        fetchNews();
        fetchStats();
      })
      .catch((err: Error) => {
        setIsAnalyzing(false);
        alert(`Sentiment analysis failed: ${err.message}`);
      });
  };

  return (
    <main className="screen">
      <Header title="News Crawler & Sentiment Analysis" />

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

          <StrategyIntegrationCard />
        </div>
      </div>
    </main>
  );
}
