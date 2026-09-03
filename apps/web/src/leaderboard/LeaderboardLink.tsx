import { Link } from 'react-router-dom';

/**
 * The way back to the ranking from the two screens that produce entries for it. A link
 * and nothing else — neither screen fetches leaderboard data to show a preview.
 */
export function LeaderboardLink({ hint }: { hint: string }) {
  return (
    <div className="controls-row">
      <Link className="btn-action" to="/leaderboard">
        Xem Bảng xếp hạng →
      </Link>
      <span className="source">{hint}</span>
    </div>
  );
}
