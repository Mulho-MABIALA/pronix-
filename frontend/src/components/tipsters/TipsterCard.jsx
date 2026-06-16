import { Link } from 'react-router-dom';
import { TipsterBadge } from '../ui/Badge';
import SuccessRateBar from '../ui/SuccessRateBar';

export default function TipsterCard({ stats, rank }) {
  const user = stats.user;
  const displayName = user?.profile?.displayName || user?.username || 'Tipster';
  const badges = stats.badges || [];

  return (
    <Link
      to={`/tipsters/${user.id}`}
      className="bento-card flex items-center gap-4 hover:border-primary-500/40 group animate-fade-in"
      aria-label={`Profil de ${displayName}`}
    >
      {/* Rang */}
      <span className={`w-8 text-center font-display font-bold shrink-0 ${rank <= 3 ? 'text-yellow-400 text-lg' : 'text-gray-500 text-sm'}`}>
        {rank <= 3 ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </span>

      {/* Avatar */}
      <div className="h-10 w-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0">
        {displayName.charAt(0).toUpperCase()}
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-100 group-hover:text-primary-300 transition-colors truncate">
          {displayName}
        </p>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {badges.map((b) => <TipsterBadge key={b} badgeCode={b} />)}
        </div>
      </div>

      {/* Taux de réussite */}
      <div className="shrink-0 w-24">
        <SuccessRateBar rate={stats.successRate} total={stats.totalTips} size="sm" />
      </div>
    </Link>
  );
}
