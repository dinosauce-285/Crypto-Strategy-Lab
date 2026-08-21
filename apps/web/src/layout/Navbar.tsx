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

const TABS = [
  { to: '/realtime', label: 'Realtime', icon: RealtimeIcon },
  { to: '/backtest', label: 'Backtest', icon: BacktestIcon },
  { to: '/news', label: 'News Crawler', icon: NewsIcon },
];

export function Navbar() {
  return (
    <nav className="navbar">
      <div>
        <p className="navbar-title">Crypto Strategy Lab</p>
        <p className="sub">the server pushes, the screen never asks twice.</p>
      </div>
      <ul className="navbar-tabs">
        {TABS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink to={to} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              <Icon />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
