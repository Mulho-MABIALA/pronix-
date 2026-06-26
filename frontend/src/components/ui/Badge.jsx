import { CheckCircle, Star, TrendingUp, Award } from 'lucide-react';

const BADGE_CONFIG = {
  TOP_MOIS:  { label: 'Top du mois', icon: Star,       color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  TOP_10:    { label: 'Top 10',      icon: TrendingUp,  color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  VERIFIED:  { label: 'Vérifié',     icon: CheckCircle, color: 'bg-primary-500/20 text-primary-400 border-primary-500/30' },
  PRO:       { label: 'Pro',         icon: Award,       color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

export function TipsterBadge({ badgeCode }) {
  const config = BADGE_CONFIG[badgeCode];
  if (!config) return null;
  const Icon = config.icon;
  return (
    <span className={`badge border ${config.color}`}>
      <Icon size={10} />
      {config.label}
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
  const config = {
    SCHEDULED: { label: 'Programmé',  style: 'bg-gray-500/20 text-gray-400' },
    LIVE:      { label: 'En direct',  style: 'bg-live-500/20 text-live-400 animate-pulse' },
    FINISHED:  { label: 'Terminé',    style: 'bg-surface-600 text-gray-400' },
    POSTPONED: { label: 'Reporté',    style: 'bg-orange-500/20 text-orange-400' },
    CANCELLED: { label: 'Annulé',     style: 'bg-red-900/20 text-red-600' },
  };
  const { label, style } = config[status] || config.SCHEDULED;
  return <span className={`badge ${style}`}>{label}</span>;
}

export function ResultBadge({ result }) {
  const config = {
    WIN:  { label: '✓ Réussi', style: 'bg-primary-500/20 text-primary-400' },
    LOSS: { label: '✗ Raté',   style: 'bg-red-500/20 text-red-400' },
    VOID: { label: '– Nul',    style: 'bg-gray-500/20 text-gray-400' },
  };
  if (!result) return <span className="badge bg-surface-600 text-gray-500">En attente</span>;
  const { label, style } = config[result] || {};
  return <span className={`badge ${style}`}>{label}</span>;
}
