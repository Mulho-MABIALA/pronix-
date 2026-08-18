import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Star, MessageSquareText, RefreshCw } from 'lucide-react';
import api from '../../services/api';

function Stars({ rating, size = 13 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} size={size} className={rating >= n ? 'text-amber-400 fill-amber-400' : 'text-ink-4'} />
      ))}
    </div>
  );
}

export default function AdminReviews() {
  const [ratingFilter, setRatingFilter] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-reviews', ratingFilter],
    queryFn: () => api.get(`/admin/reviews${ratingFilter ? `?rating=${ratingFilter}` : ''}`).then((r) => r.data),
  });

  const reviews = data?.data || [];
  const stats = data?.stats || { average: 0, total: 0 };

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-1">Avis utilisateurs</h1>
          <p className="text-sm text-ink-4 mt-0.5">Note moyenne + commentaires laissés via le popup périodique</p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary gap-2 text-sm py-2 px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Résumé */}
      <div
        className="rounded-2xl border border-overlay/[0.11] p-5 flex items-center gap-6 flex-wrap"
        style={{ background: 'var(--color-card)' }}
      >
        <div className="flex items-center gap-3">
          <span className="text-3xl font-display font-bold text-ink-1">{stats.average.toFixed(1)}</span>
          <div>
            <Stars rating={Math.round(stats.average)} size={16} />
            <p className="text-[11px] text-ink-3 mt-0.5">{stats.total} avis au total</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['', 'Tous'], ['5', '5 ★'], ['4', '4 ★'], ['3', '3 ★'], ['2', '2 ★'], ['1', '1 ★']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setRatingFilter(val)}
            className="filter-chip"
            data-active={ratingFilter === val ? 'true' : 'false'}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-overlay/[0.11] p-12 text-center" style={{ background: 'var(--color-card)' }}>
          <MessageSquareText size={32} className="text-ink-4 mx-auto mb-3" />
          <p className="text-ink-4 font-medium">Aucun avis pour le moment</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => {
            const displayName = r.user?.profile?.displayName || r.user?.username || r.user?.email;
            return (
              <div
                key={r.id}
                className="rounded-2xl border border-overlay/[0.11] p-4 shine-subtle"
                style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.06)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Stars rating={r.rating} />
                    {r.comment && <p className="text-sm text-ink-1 leading-relaxed mt-2">{r.comment}</p>}
                    <p className="text-[11px] text-ink-3 mt-1.5">
                      {displayName} · {format(new Date(r.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
