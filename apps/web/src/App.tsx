import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './layout/Navbar';
import { TickerStrip } from './market/TickerStrip';

// One screen per chunk. The charting library is a third of the bundle and only two of the
// five screens draw a chart, so the first paint no longer waits on it.
const RealtimeScreen = lazy(() =>
  import('./screens/RealtimeScreen').then((m) => ({ default: m.RealtimeScreen })),
);
const BacktestScreen = lazy(() =>
  import('./screens/BacktestScreen').then((m) => ({ default: m.BacktestScreen })),
);
const SearchScreen = lazy(() =>
  import('./screens/SearchScreen').then((m) => ({ default: m.SearchScreen })),
);
const LeaderboardScreen = lazy(() =>
  import('./screens/LeaderboardScreen').then((m) => ({ default: m.LeaderboardScreen })),
);
const NewsScreen = lazy(() =>
  import('./screens/NewsScreen').then((m) => ({ default: m.NewsScreen })),
);

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <TickerStrip />
        <Suspense fallback={<ScreenLoading />}>
          <Routes>
            <Route path="/" element={<Navigate to="/realtime" replace />} />
            <Route path="/realtime" element={<RealtimeScreen />} />
            <Route path="/backtest" element={<BacktestScreen />} />
            <Route path="/search" element={<SearchScreen />} />
            <Route path="/leaderboard" element={<LeaderboardScreen />} />
            <Route path="/news" element={<NewsScreen />} />
          </Routes>
        </Suspense>
      </div>
    </BrowserRouter>
  );
}

/** The gap while a screen's chunk arrives. It keeps the shell's height so nothing jumps. */
function ScreenLoading() {
  return (
    <main className="screen">
      <div className="stage grows">
        <p className="state">Đang mở màn hình…</p>
      </div>
    </main>
  );
}
