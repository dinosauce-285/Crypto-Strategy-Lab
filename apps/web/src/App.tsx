import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Navbar } from './layout/Navbar';
import { RealtimeScreen } from './screens/RealtimeScreen';
import { BacktestScreen } from './screens/BacktestScreen';

export function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Navbar />
        <Routes>
          <Route path="/" element={<Navigate to="/realtime" replace />} />
          <Route path="/realtime" element={<RealtimeScreen />} />
          <Route path="/backtest" element={<BacktestScreen />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
