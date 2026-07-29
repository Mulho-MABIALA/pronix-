import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { TipsterBadge } from '../ui/Badge';
import SuccessRateBar from '../ui/SuccessRateBar';
import Avatar from '../ui/Avatar';
import InfoTooltip from '../ui/InfoTooltip';
import { estimateTipsterROI } from '../../utils/mockOdds';

const PODIUM_RING = {
  1: 'ring-2 ring-amber-400/60',
  2: 'ring-2 ring-gray-300/40',
  3: 'ring-2 ring-orange-400/40',
};

export default function TipsterCard({ stats, rank }) {
  const { t } = useTranslation();
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
      aria-label={t('tipsterCard.profileOf', { name: displayName })}
    >
      {/* Rang */}
      <span className={`w-8 text-center font-display font-bold shrink-0 ${isPodium ? 'text-amber-400 text-lg' : 'text-gray-300 text-sm'}`}>
        {isPodium ? ['🥇','🥈','🥉'][rank - 1] : `#${rank}`}
      </span>

      {/* Avatar */}
      <Avatar user={user} name={displayName} size={40} className={PODIUM_RING[rank] || ''} />

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="font-semibold text-gray-100 group-hover:text-primary-300 transition-colors truncate">
            {displayName}
          </p>
          {user?.username === 'fpronix_ai' && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary-500/15 text-primary-400 border border-primary-500/20 shrink-0">
              🤖 IA
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          {badges.map((b) => <TipsterBadge key={b} badgeCode={b} />)}
        </div>
      </div>

      {/* Taux de réussite */}
      <div className="shrink-0 w-16 sm:w-24 space-y-1">
        <SuccessRateBar rate={stats.successRate} total={stats.totalTips} size="sm" stacked />
        {roi != null && (
          <p className={`text-[10px] text-right font-semibold tabular-nums flex items-center justify-end gap-0.5 ${roi >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
            ROI {roi >= 0 ? '+' : ''}{roi}%
            <InfoTooltip text={t('tipsterCard.roiTooltip')} size={9} align="right" />
          </p>
        )}
      </div>
    </Link>
  );
}
