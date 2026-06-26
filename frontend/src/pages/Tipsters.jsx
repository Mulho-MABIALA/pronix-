import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';
import api from '../services/api';
import TipsterCard from '../components/tipsters/TipsterCard';
import { SkeletonTipsterRow } from '../components/ui/SkeletonLoader';

export default function Tipsters() {
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
          <h1 className="font-display font-bold text-2xl text-gray-100">Classement Tipsters</h1>
        </div>
        <p className="text-gray-500 text-sm mt-1">
          Taux de réussite calculé automatiquement sur les pronostics vérifiés.
        </p>
        <p className="disclaimer mt-2">
          Ces données sont informatives. Aucune garantie de gain. Jouez de façon responsable.
        </p>
      </div>

      {/* Toggle période */}
      <div className="flex gap-2" role="group" aria-label="Période du classement">
        {[
          { value: 'global', label: 'Global' },
          { value: 'monthly', label: 'Ce mois' },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => { setPeriod(value); setPage(1); }}
            aria-pressed={period === value}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
              period === value ? 'bg-primary-500 text-white' : 'bg-surface-700 text-gray-400 hover:text-gray-200'
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
              <p className="text-gray-400">Aucun tipster classé pour le moment</p>
              <p className="text-gray-500 text-sm mt-1">Il faut au moins 5 pronostics pour apparaître.</p>
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
            ← Précédent
          </button>
          <span className="text-sm text-gray-400">{page} / {pagination.pages}</span>
          <button
            onClick={() => setPage(page + 1)}
            disabled={page >= pagination.pages}
            className="btn-secondary text-sm disabled:opacity-40"
          >
            Suivant →
          </button>
        </div>
      )}
    </div>
  );
}
