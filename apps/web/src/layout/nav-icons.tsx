// Hand-drawn, not a library — a handful of icons don't justify a dependency, and drawing
// them all on the same 20x20 viewBox at the same 1.5 stroke width satisfies
// UI_CONSTRAINT's "one icon family, one stroke width" by construction rather than by
// picking matching icons out of someone else's set.

interface IconProps {
  size?: number;
}

function Frame({ size = 15, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

/** Two candles on a baseline — the subject of the whole app, drawn once. */
export function BrandMark({ size = 18 }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M6.5 3v3M6.5 14v3M13.5 3v4M13.5 15v2" />
      <rect x="4" y="6" width="5" height="8" rx="1" />
      <rect x="11" y="7" width="5" height="8" rx="1" />
    </Frame>
  );
}

export function RealtimeIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M2 11h3.5l2-6 3 12 2-9 1.5 3H18" />
    </Frame>
  );
}

export function BacktestIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <circle cx="10" cy="11" r="7" />
      <path d="M10 7.5V11l2.5 1.5" />
      <path d="M6.5 3.5 4 5.5M13.5 3.5 16 5.5" />
    </Frame>
  );
}

export function SearchIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M4 5.5h8M4 10h12M4 14.5h6" />
      <circle cx="14.5" cy="5.5" r="1.8" />
      <circle cx="8.5" cy="14.5" r="1.8" />
    </Frame>
  );
}

export function LeaderboardIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M6 16.5h8M8 16.5v-3h4v3M5 3.5h10v4a5 5 0 0 1-10 0v-4ZM5 5.5H3a1.5 1.5 0 0 0-1.5 1.5v1A2.5 2.5 0 0 0 4 10.5h1M15 5.5h2a1.5 1.5 0 0 1 1.5 1.5v1A2.5 2.5 0 0 1 16 10.5h-1" />
    </Frame>
  );
}

export function NewsIcon({ size }: IconProps) {
  return (
    <Frame size={size}>
      <path d="M4 4.5h12a1.5 1.5 0 0 1 1.5 1.5v9a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 15V6A1.5 1.5 0 0 1 4 4.5Z" />
      <path d="M6 8h8M6 11h8M6 14h5" />
    </Frame>
  );
}
