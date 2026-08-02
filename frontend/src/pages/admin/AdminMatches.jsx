import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';
import CompetitionLogo from '../../components/ui/CompetitionLogo';

// Logo d'équipe avec fallback pastille initiale
function TeamLogo({ logo, name, size = 20 }) {
  const [error, setError] = useState(false);
  if (!logo || error) {
    return (
      <span
        className="shrink-0 rounded-full bg-overlay/[0.1] text-ink-3 flex items-center justify-center font-bold"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >
        {(name || '?').charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      src={logo} alt="" width={size} height={size} loading="lazy"
      onError={() => setError(true)}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

const STATUS_STYLE = {
  SCHEDULED: 'bg-gray-500/15 text-ink-4',
  LIVE:      'bg-live-500/15 text-live-400',
  FINISHED:  'bg-primary-500/15 text-primary-400',
  POSTPONED: 'bg-amber-500/15 text-amber-400',
  CANCELLED: 'bg-overlay/[0.08] text-ink-4',
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
        <h1 className="font-display font-bold text-2xl text-ink-1">Matchs</h1>
        <p className="text-sm text-ink-3 mt-0.5">{pagination?.total ?? 0} matchs en base</p>
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
                : 'bg-overlay/[0.05] border-overlay/[0.11] text-ink-4 hover:border-overlay/[0.2] hover:text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-overlay/[0.11] overflow-hidden shine-subtle"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-overlay/[0.07] divide-x divide-overlay/[0.07] text-xs text-ink-3 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Match</th>
                <th className="text-left px-4 py-3.5 font-medium hidden md:table-cell">Compétition</th>
                <th className="text-center px-4 py-3.5 font-medium">Score</th>
                <th className="text-left px-4 py-3.5 font-medium">Statut</th>
                <th className="text-center px-4 py-3.5 font-medium hidden lg:table-cell">Pronos</th>
                <th className="text-left px-5 py-3.5 font-medium hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-overlay/[0.04]">
              {isLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="divide-x divide-overlay/[0.05]">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded" />
                      </td>
                    ))}
                  </tr>
                ))
                : matches.map((m) => (
                  <tr key={m.id} className="hover:bg-overlay/[0.025] transition-colors divide-x divide-overlay/[0.05]">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm font-medium text-ink-2 max-w-[240px]">
                        <TeamLogo logo={m.homeTeamLogo} name={m.homeTeam} />
                        <span className="truncate">{m.homeTeam}</span>
                        <span className="text-ink-4 shrink-0">vs</span>
                        <TeamLogo logo={m.awayTeamLogo} name={m.awayTeam} />
                        <span className="truncate">{m.awayTeam}</span>
                      </div>
                      {m.round && <p className="text-xs text-ink-4 mt-0.5">{m.round}</p>}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell text-xs text-ink-3 max-w-[160px]">
                      <div className="flex items-center gap-1.5">
                        <CompetitionLogo logo={m.competition?.logo} size={15} />
                        <span className="truncate">{m.competition?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {m.homeScore !== null
                        ? <span className="text-sm font-bold text-ink-1 font-mono">{m.homeScore}–{m.awayScore}</span>
                        : <span className="text-ink-4 text-xs">–</span>
                      }
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${STATUS_STYLE[m.status] || STATUS_STYLE.SCHEDULED}`}>
                        {STATUS_LABELS[m.status] || m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden lg:table-cell text-sm text-ink-3">
                      {m._count?.tips ?? 0}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell text-xs text-ink-3">
                      {format(new Date(m.scheduledAt), 'dd MMM yyyy, HH:mm', { locale: fr })}
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
        </div>

        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-overlay/[0.07]">
            <p className="text-xs text-ink-3">Page {page} / {pagination.pages}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
