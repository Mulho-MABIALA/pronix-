import { Link } from 'react-router-dom';
import { TipsterBadge } from '../ui/Badge';
import SuccessRateBar from '../ui/SuccessRateBar';
import { estimateTipsterROI } from '../../utils/mockOdds';

const PODIUM_RING = {
  1: 'ring-2 ring-amber-400/60',
  2: 'ring-2 ring-gray-300/40',
  3: 'ring-2 ring-orange-400/40',
};

export default function TipsterCard({ stats, rank }) {
  const user = stats.user;
  const displayName = user?.profile?.displayName || user?.username || 'Tipster';
  const badges = stats.badges || [];
  const isPodium = rank <= 3;
  const roi = stats.totalTips > 0 ? estimateTipsterROI(stats.successRate, user.id) : null;

  return (
    <Link
      to={`/tipsters/${user.id}`}
      className={`bento-card flex items-center gap-4 hover:border-primary-500/40 group animate-fade-in ${
        isPodium ? 'bg-gradient-to-r from-amber-500/[0.04] to-transparent' : ''
      }`}
      aria-label={`Profil de ${displayName}`}
    >
      {/* Rang */}
      <span className={`w-8 text-center font-display font-bold shrink-0 ${isPodium ? 'text-amber-400 text-lg' : 'text-gray-500 text-sm'}`}>
        {isPodium ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </span>

      {/* Avatar */}
      <div className={`h-10 w-10 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0 ${PODIUM_RING[rank] || ''}`}>
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
      <div className="shrink-0 w-24 space-y-1">
        <SuccessRateBar rate={stats.successRate} total={stats.totalTips} size="sm" />
        {roi != null && (
          <p
            className={`text-[10px] text-right font-semibold tabular-nums ${roi >= 0 ? 'text-primary-400' : 'text-red-400'}`}
            title="ROI estimé — calculé à partir du taux de réussite et d'une cote moyenne simulée"
          >
            ROI {roi >= 0 ? '+' : ''}{roi}%
          </p>
        )}
      </div>
    </Link>
  );
}
