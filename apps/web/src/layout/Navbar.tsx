import { NavLink } from 'react-router-dom';

// Hand-drawn, not a library — two icons don't justify a dependency, and drawing both
// with the same viewBox/stroke-width satisfies UI_CONSTRAINT's "one icon family" by
// construction rather than by picking matching icons out of someone else's set.
function RealtimeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M2 11h3.5l2-6 3 12 2-9 1.5 3H18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BacktestIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 7.5V11l2.5 1.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 3.5 4 5.5M13.5 3.5 16 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NewsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6 8h8M6 11h8M6 14h5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LeaderboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M6 16.5h8M8 16.5v-3h4v3M5 3.5h10v4a5 5 0 0 1-10 0v-4ZM5 5.5H3a1.5 1.5 0 0 0-1.5 1.5v1A2.5 2.5 0 0 0 4 10.5h1M15 5.5h2a1.5 1.5 0 0 1 1.5 1.5v1A2.5 2.5 0 0 1 16 10.5h-1"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4 5.5h8M4 10h12M4 14.5h6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="14.5" cy="5.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="8.5" cy="14.5" r="1.8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const TABS = [
  { to: '/realtime', label: 'Thời gian thực', icon: RealtimeIcon },
  { to: '/backtest', label: 'Backtest', icon: BacktestIcon, title: 'Backtest: kiểm thử chiến lược trên dữ liệu lịch sử' },
  { to: '/search', label: 'Tìm kiếm', icon: SearchIcon },
  { to: '/leaderboard', label: 'Bảng xếp hạng', icon: LeaderboardIcon },
  { to: '/news', label: 'Tin tức', icon: NewsIcon },
];

export function Navbar() {
  return (
    <nav className="navbar">
      <div>
        <p className="navbar-title">Crypto Strategy Lab</p>
        <p className="sub">Theo dõi, kiểm thử và xếp hạng chiến lược giao dịch crypto.</p>
      </div>
      <ul className="navbar-tabs">
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
  );
}
