import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Trophy, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TipsterCard from '../components/tipsters/TipsterCard';
import { SkeletonTipsterRow } from '../components/ui/SkeletonLoader';
import InfoTooltip from '../components/ui/InfoTooltip';

export default function Tipsters() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('global');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['leaderboard', period, page],
    queryFn: () => api.get(`/tips/leaderboard?period=${period}&page=${page}&limit=20`).then((r) => r.data),
  });

  const tipsters = data?.data || [];
  const pagination = data?.pagination;
  const offset = (page - 1) * 20;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Trophy size={22} className="text-primary-400" />
          <h1 className="font-display font-bold text-2xl text-ink-1">{t('tipsters.leaderboardTitle')}</h1>
        </div>
        <p className="text-ink-3 text-sm mt-1 flex items-center gap-1">
          {t('tipsters.leaderboardDesc')}
          <InfoTooltip text={t('tipsterCard.roiTooltip')} size={11} align="left" />
        </p>
        <p className="disclaimer mt-2">
          {t('tipsters.disclaimer')}
        </p>
      </div>

      {/* Toggle période */}
      <div className="flex gap-2" role="group" aria-label={t('tipsters.periodGroupLabel')}>
        {[
          { value: 'global', label: t('tipsters.periodGlobal') },
          { value: 'monthly', label: t('tipsters.periodMonthly') },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setPeriod(value); setPage(1); }}
            aria-pressed={period === value}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === value ? 'bg-primary-500 text-white' : 'bg-surface-700 text-ink-4 hover:text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      <div className="space-y-2">
        {isLoading
          ? Array.from({ length: 10 }).map((_, i) => <SkeletonTipsterRow key={i} />)
          : tipsters.length === 0
          ? (
            <div className="bento-card text-center py-12">
              <p className="text-4xl mb-3" aria-hidden="true">🏆</p>
              <p className="text-ink-4">{t('tipsters.noTipsters')}</p>
              <p className="text-ink-3 text-sm mt-1">{t('tipsters.noTipstersDesc')}</p>
            </div>
          )
          : tipsters.map((stats, i) => (
              <TipsterCard key={stats.id} stats={stats} rank={offset + i + 1} />
            ))
        }
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            {t('tipsters.prev')}
          </button>
          <span className="text-sm text-ink-4">{page} / {pagination.pages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.pages}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            {t('tipsters.next')}
          </button>
        </div>
      )}

      {/* Classement complet réservé Premium */}
      {data?.premiumLocked && (
        <Link
          to="/abonnement"
          className="bento-card flex items-center gap-3 hover:border-primary-500/40 transition-colors"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
            <Lock size={16} className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-ink-1">{t('tipsters.fullLeaderboardTitle')}</p>
            <p className="text-xs text-ink-4">{t('tipsters.fullLeaderboardDesc', { total: pagination?.total })}</p>
          </div>
        </Link>
      )}
    </div>
  );
}
