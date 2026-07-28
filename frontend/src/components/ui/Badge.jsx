import { useTranslation } from 'react-i18next';
import { CheckCircle, Star, TrendingUp, Award } from 'lucide-react';

const BADGE_ICONS = {
  TOP_MOIS: Star,
  TOP_10: TrendingUp,
  VERIFIED: CheckCircle,
  PRO: Award,
};

const BADGE_COLORS = {
  TOP_MOIS: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  TOP_10: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  VERIFIED: 'bg-primary-500/20 text-primary-400 border-primary-500/30',
  PRO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export function TipsterBadge({ badgeCode }) {
  const { t } = useTranslation();
  const Icon = BADGE_ICONS[badgeCode];
  if (!Icon) return null;
  return (
    <span className={`badge border ${BADGE_COLORS[badgeCode]}`}>
      <Icon size={10} />
      {t(`badges.tipster.${badgeCode}`)}
    </span>
  );
}

export function PlanBadge({ planCode }) {
  const styles = {
    FREE:    'bg-gray-500/20 text-gray-400',
    PREMIUM: 'bg-primary-500/20 text-primary-400',
  };
  return (
    <span className={`badge ${styles[planCode] || styles.FREE}`}>
      {planCode}
    </span>
  );
}

export function MatchStatusBadge({ status }) {
  const { t } = useTranslation();
  const styles = {
    SCHEDULED: 'bg-gray-500/20 text-gray-400',
    LIVE:      'bg-live-500/20 text-live-400 animate-pulse',
    FINISHED:  'bg-surface-600 text-gray-400',
    POSTPONED: 'bg-orange-500/20 text-orange-400',
    CANCELLED: 'bg-red-900/20 text-red-600',
  };
  const key = styles[status] ? status : 'SCHEDULED';
  return <span className={`badge ${styles[key]}`}>{t(`badges.matchStatus.${key}`)}</span>;
}

export function ResultBadge({ result }) {
  const { t } = useTranslation();
  const styles = {
    WIN:  'bg-primary-500/20 text-primary-400',
    LOSS: 'bg-red-500/20 text-red-400',
    VOID: 'bg-gray-500/20 text-gray-400',
  };
  if (!result) return <span className="badge bg-surface-600 text-gray-300">{t('badges.result.PENDING')}</span>;
  return <span className={`badge ${styles[result] || ''}`}>{t(`badges.result.${result}`)}</span>;
}
