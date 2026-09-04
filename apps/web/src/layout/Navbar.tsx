import { NavLink } from 'react-router-dom';
import { ChannelStatusPill } from './ChannelStatusPill';
import {
  BacktestIcon,
  BrandMark,
  LeaderboardIcon,
  NewsIcon,
  RealtimeIcon,
  SearchIcon,
} from './nav-icons';

const TABS = [
  { to: '/realtime', label: 'Thời gian thực', icon: RealtimeIcon },
  {
    to: '/backtest',
    label: 'Backtest',
    icon: BacktestIcon,
    title: 'Backtest: kiểm thử chiến lược trên dữ liệu lịch sử',
  },
  { to: '/search', label: 'Tìm kiếm', icon: SearchIcon },
  { to: '/leaderboard', label: 'Bảng xếp hạng', icon: LeaderboardIcon },
  { to: '/news', label: 'News Crawler', icon: NewsIcon },
];

export function Navbar() {
  return (
    <header className="app-header">
      <NavLink to="/realtime" className="brand">
        <span className="brand-mark">
          <BrandMark />
        </span>
        <span className="brand-name">Crypto Strategy Lab</span>
      </NavLink>

      <nav aria-label="Màn hình">
        <ul className="app-nav">
          {TABS.map(({ to, label, icon: Icon, title }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) => (isActive ? 'active' : undefined)}
                title={title}
              >
                <Icon />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="app-header-end">
        <ChannelStatusPill />
      </div>
    </header>
  );
}
