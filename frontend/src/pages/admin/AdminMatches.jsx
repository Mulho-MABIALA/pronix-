import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const STATUS_STYLE = {
  SCHEDULED: 'bg-gray-500/15 text-gray-400',
  LIVE:      'bg-live-500/15 text-live-400',
  FINISHED:  'bg-primary-500/15 text-primary-400',
  POSTPONED: 'bg-amber-500/15 text-amber-400',
  CANCELLED: 'bg-surface-700 text-gray-600',
};
const STATUS_LABELS = {
  SCHEDULED: 'Programmé', LIVE: 'En direct',
  FINISHED: 'Terminé', POSTPONED: 'Reporté', CANCELLED: 'Annulé',
};

export default function AdminMatches() {
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-matches', statusFilter, page],
    queryFn: () => api.get('/admin/matches', {
      params: { page, limit: 20, ...(statusFilter && { status: statusFilter }) },
    }).then((r) => r.data),
  });

  const matches = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Matchs</h1>
        <p className="text-sm text-gray-500 mt-0.5">{pagination?.total ?? 0} matchs en base</p>
      </div>

      {/* Filtres */}
      <div className="flex gap-2 flex-wrap">
        {[['', 'Tous'], ['LIVE', 'En direct'], ['SCHEDULED', 'Programmés'], ['FINISHED', 'Terminés']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => { setStatusFilter(val); setPage(1); }}
            className={`text-xs font-medium px-3.5 py-2 rounded-xl border transition-colors ${
              statusFilter === val
                ? 'bg-primary-500/20 border-primary-500/40 text-primary-300'
                : 'bg-surface-800 border-surface-700 text-gray-400 hover:border-surface-600 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Match</th>
                <th className="text-left px-4 py-3.5 font-medium hidden md:table-cell">Compétition</th>
                <th className="text-center px-4 py-3.5 font-medium">Score</th>
                <th className="text-left px-4 py-3.5 font-medium">Statut</th>
                <th className="text-center px-4 py-3.5 font-medium hidden lg:table-cell">Pronos</th>
                <th className="text-left px-5 py-3.5 font-medium hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
                : matches.map((m) => (
                  <tr key={m.id} className="hover:bg-surface-700/40 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-medium text-gray-200 truncate max-w-[180px]">
                        {m.homeTeam} <span className="text-gray-600">vs</span> {m.awayTeam}
                      </p>
                      {m.round && <p className="text-xs text-gray-600 mt-0.5">{m.round}</p>}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-gray-500 truncate max-w-[140px]">
                      {m.competition?.name}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {m.homeScore !== null
                        ? <span className="text-sm font-bold text-gray-100 font-mono">{m.homeScore}–{m.awayScore}</span>
                        : <span className="text-gray-600 text-xs">–</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${STATUS_STYLE[m.status] || STATUS_STYLE.SCHEDULED}`}>
                        {STATUS_LABELS[m.status] || m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden lg:table-cell text-sm text-gray-500">
                      {m._count?.tips ?? 0}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-gray-500">
                      {format(new Date(m.scheduledAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-700">
            <p className="text-xs text-gray-500">Page {page} / {pagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
