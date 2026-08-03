import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Brain, TrendingUp, TrendingDown, Star, AlertCircle, Loader2, Lock } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import AiBadge from '../ui/AiBadge';

const PRED_KEYS = {
  HOME_WIN: 'HOME_WIN', AWAY_WIN: 'AWAY_WIN', DRAW: 'DRAW',
  OVER_2_5: 'OVER_2_5', UNDER_2_5: 'UNDER_2_5',
  BTTS_YES: 'BTTS_YES', BTTS_NO: 'BTTS_NO',
};

function ScoreRing({ score }) {
  const { t } = useTranslation();
  const color = score >= 70 ? 'text-green-400' : score >= 45 ? 'text-amber-400' : 'text-red-400';
  return (
    <div className={`text-center ${color}`}>
      <p className="text-4xl font-display font-black">{score}</p>
      <p className="text-xs text-ink-3 mt-0.5">{t('coachPanel.bettorScore')}</p>
    </div>
  );
}

export default function CoachPanel() {
  const { t } = useTranslation();
  const { isPremium } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['coach-advice'],
    queryFn: () => api.get('/coach/advice').then((r) => r.data.data),
    staleTime: 5 * 60 * 1000,
    enabled: isPremium,
  });

  if (!isPremium) {
    return (
      <div className="bento-card text-center py-6">
        <Lock size={22} className="text-primary-400 mx-auto mb-2" />
        <p className="text-sm font-semibold text-ink-2 mb-1">{t('coachPanel.title')}</p>
        <p className="text-xs text-ink-3 mb-4">{t('coachPanel.premiumLocked')}</p>
        <Link to="/abonnement" className="btn-primary px-6 py-2 text-sm inline-flex items-center gap-2">
          {t('common.premium')}
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bento-card flex items-center gap-3 text-ink-3">
        <Loader2 size={16} className="animate-spin text-primary-400" />
        <span className="text-sm">{t('coachPanel.analyzingHistory')}</span>
      </div>
    );
  }

  if (error || !data) return null;

  if (!data.hasEnoughData) {
    return (
      <div className="bento-card flex items-start gap-3">
        <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-ink-2">{t('coachPanel.title')}</p>
          <p className="text-xs text-ink-3 mt-0.5">{data.message}</p>
        </div>
      </div>
    );
  }

  const { stats, advice } = data;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary-500/15 flex items-center justify-center">
          <Brain size={16} className="text-primary-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-1 flex items-center gap-1.5">
            {t('coachPanel.title')}
            <AiBadge />
          </p>
          <p className="text-xs text-ink-3">{t('coachPanel.analysisOfLastBets', { count: stats.total })}</p>
        </div>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bento-card text-center py-2 px-1">
          <p className="text-lg font-display font-bold text-ink-1">{stats.winRate}%</p>
          <p className="text-xs text-ink-3">{t('tipsters.successRate')}</p>
        </div>
        <div className="bento-card text-center py-2 px-1">
          <p className={`text-lg font-display font-bold ${Number(stats.roi) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {stats.roi}%
          </p>
          <p className="text-xs text-ink-3">ROI</p>
        </div>
        <div className="bento-card text-center py-2 px-1">
          <p className="text-lg font-display font-bold text-ink-1">{stats.avgOdds}</p>
          <p className="text-xs text-ink-3">{t('coachPanel.avgOdds')}</p>
        </div>
        {advice?.score != null && (
          <div className="bento-card text-center py-2 px-1">
            <ScoreRing score={advice.score} />
          </div>
        )}
      </div>

      {/* Points forts / faibles */}
      <div className="grid grid-cols-2 gap-2">
        {stats.strongestType && (
          <div className="bento-card flex items-start gap-2 border-green-500/20 bg-green-500/5">
            <TrendingUp size={14} className="text-green-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-green-400 font-semibold uppercase tracking-wide">{t('coachPanel.strength')}</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {t(`coachPanel.predLabels.${PRED_KEYS[stats.strongestType.name]}`, { defaultValue: stats.strongestType.name })}
              </p>
              <p className="text-xs text-ink-3">
                {t('coachPanel.wonFraction', { wins: stats.strongestType.wins, total: stats.strongestType.total })}
              </p>
            </div>
          </div>
        )}
        {stats.weakestType && (
          <div className="bento-card flex items-start gap-2 border-red-500/20 bg-red-500/5">
            <TrendingDown size={14} className="text-red-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] text-red-400 font-semibold uppercase tracking-wide">{t('coachPanel.toAvoid')}</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {t(`coachPanel.predLabels.${PRED_KEYS[stats.weakestType.name]}`, { defaultValue: stats.weakestType.name })}
              </p>
              <p className="text-xs text-ink-3">
                {t('coachPanel.wonFraction', { wins: stats.weakestType.wins, total: stats.weakestType.total })}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Conseils IA */}
      {advice && (
        <div className="bento-card space-y-3">
          {advice.summary && (
            <p className="text-sm text-ink-3 italic">"{ advice.summary }"</p>
          )}
          {advice.tips?.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <Star size={13} className="text-amber-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs font-semibold text-ink-2">{tip.title}</p>
                <p className="text-xs text-ink-3 mt-0.5">{tip.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
