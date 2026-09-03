import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './layout/Navbar';
import { TickerStrip } from './market/TickerStrip';
import { RealtimeScreen } from './screens/RealtimeScreen';
import { BacktestScreen } from './screens/BacktestScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { NewsScreen } from './screens/NewsScreen';
import { SearchScreen } from './screens/SearchScreen';

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <TickerStrip />
        <Routes>
          <Route path="/" element={<Navigate to="/realtime" replace />} />
          <Route path="/realtime" element={<RealtimeScreen />} />
          <Route path="/backtest" element={<BacktestScreen />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/leaderboard" element={<LeaderboardScreen />} />
          <Route path="/news" element={<NewsScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
