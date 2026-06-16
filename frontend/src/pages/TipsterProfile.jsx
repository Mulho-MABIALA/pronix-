import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Flag } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { TipsterBadge, ResultBadge } from '../components/ui/Badge';
import SuccessRateBar from '../components/ui/SuccessRateBar';
import { SkeletonCard, SkeletonText } from '../components/ui/SkeletonLoader';

const PRED_LABELS = {
  HOME_WIN: '1 — Dom.', DRAW: 'X — Nul', AWAY_WIN: '2 — Ext.',
  OVER_2_5: '+2.5', UNDER_2_5: '-2.5', BTTS_YES: 'BTTS Oui', BTTS_NO: 'BTTS Non',
};

export default function TipsterProfile() {
  const { userId } = useParams();
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['tipster', userId],
    queryFn: () => api.get(`/tips/tipster/${userId}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <SkeletonCard className="h-32" />
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    );
  }

  const { user: tipster, stats, recentTips } = data?.data || {};
  if (!tipster) return <div className="text-center py-20 text-gray-500">Tipster introuvable</div>;

  const displayName = tipster.profile?.displayName || tipster.username;
  const isOwn = user?.id === userId;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 animate-fade-in">
      {/* Profil header */}
      <section className="bento-card">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-2xl font-bold shrink-0">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-xl text-gray-100">{displayName}</h1>
            <p className="text-gray-500 text-sm">@{tipster.username}</p>
            {tipster.profile?.bio && (
              <p className="text-gray-400 text-sm mt-2">{tipster.profile.bio}</p>
            )}
            <div className="flex flex-wrap gap-1 mt-2">
              {(stats?.badges || []).map((b) => <TipsterBadge key={b} badgeCode={b} />)}
            </div>
          </div>

          {!isOwn && user && (
            <button
              onClick={() => api.post('/profiles/me/favorites', { type: 'tipster', externalId: userId, name: displayName })}
              className="btn-secondary text-sm p-2"
              aria-label="Ajouter aux favoris"
            >
              ★
            </button>
          )}
        </div>
      </section>

      {/* Stats bento grid */}
      {stats && (
        <div className="grid grid-cols-2 gap-3">
          <div className="bento-card text-center">
            <p className="text-3xl font-display font-bold text-gray-100">{stats.totalTips}</p>
            <p className="text-xs text-gray-500 mt-1">Pronostics</p>
          </div>
          <div className="bento-card">
            <SuccessRateBar rate={stats.successRate} total={stats.totalTips} size="lg" />
            <p className="text-xs text-gray-500 mt-1">Taux de réussite global</p>
          </div>
          <div className="bento-card text-center">
            <p className="text-2xl font-display font-bold text-gray-100">
              {stats.globalRank ? `#${stats.globalRank}` : '–'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Classement global</p>
          </div>
          <div className="bento-card text-center">
            <p className="text-2xl font-display font-bold text-gray-100">
              {stats.monthlyRank ? `#${stats.monthlyRank}` : '–'}
            </p>
            <p className="text-xs text-gray-500 mt-1">Classement du mois</p>
          </div>
        </div>
      )}

      {/* Pronostics récents */}
      <section>
        <h2 className="font-semibold text-gray-100 mb-3">Pronostics récents</h2>
        <div className="space-y-2">
          {recentTips?.map((tip) => (
            <div key={tip.id} className="bento-card flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <Link to={`/matchs/${tip.matchId}`} className="text-sm font-medium text-gray-200 hover:text-primary-300 truncate block">
                  {tip.match?.homeTeam} vs {tip.match?.awayTeam}
                </Link>
                <p className="text-xs text-gray-500 mt-0.5">
                  {PRED_LABELS[tip.prediction] || tip.prediction}{' '}
                  · {format(new Date(tip.createdAt), 'dd MMM', { locale: fr })}
                </p>
              </div>
              <ResultBadge result={tip.result} />
            </div>
          ))}
          {!recentTips?.length && (
            <p className="text-gray-500 text-sm text-center py-4">Aucun pronostic récent</p>
          )}
        </div>
      </section>

      {/* Signalement (si connecté et pas le sien) */}
      {!isOwn && user && recentTips?.length > 0 && (
        <p className="text-center">
          <button
            onClick={() => {/* modal signalement */}}
            className="text-xs text-gray-600 hover:text-gray-400 flex items-center gap-1 mx-auto"
          >
            <Flag size={12} aria-hidden="true" />
            Signaler ce tipster
          </button>
        </p>
      )}

      <p className="disclaimer text-center">
        Taux de réussite calculé automatiquement. Aucune garantie de gain. Jouez de façon responsable.
      </p>
    </div>
  );
}
