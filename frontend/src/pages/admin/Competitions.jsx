import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import CompetitionLogo from '../../components/ui/CompetitionLogo';

export default function AdminCompetitions() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-competitions'],
    queryFn: () => api.get('/admin/competitions').then((r) => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isDisplayed }) => api.patch(`/admin/competitions/${id}/display`, { isDisplayed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-competitions'] }),
  });

  const competitions = data?.data || [];
  const displayed = competitions.filter(c => c.isDisplayed).length;

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-1">Compétitions</h1>
        <p className="text-sm text-ink-3 mt-0.5">
          {displayed} / {competitions.length} compétitions affichées
        </p>
      </div>

      <div className="rounded-2xl border border-overlay/[0.11] overflow-hidden shine-subtle"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.07)' }}>
        {isLoading ? (
          <div className="divide-y divide-overlay/[0.09]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-4 w-4 skeleton rounded" />
                <div className="h-4 flex-1 skeleton rounded" />
                <div className="h-6 w-16 skeleton rounded" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-overlay/[0.07] divide-x divide-overlay/[0.07] text-xs text-ink-3 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Compétition</th>
                <th className="text-left px-4 py-3.5 font-medium hidden sm:table-cell">Pays</th>
                <th className="text-left px-4 py-3.5 font-medium hidden md:table-cell">ID API</th>
                <th className="text-center px-4 py-3.5 font-medium hidden md:table-cell">Matchs</th>
                <th className="text-center px-4 py-3.5 font-medium">Affichée</th>
                <th className="text-right px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-overlay/[0.09]">
              {competitions.map((c) => (
                <tr key={c.id} className={`hover:bg-overlay/[0.025] transition-colors divide-x divide-overlay/[0.05] ${!c.isDisplayed ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <CompetitionLogo logo={c.logo} size={28} />
                      <span className="text-sm font-medium text-ink-2">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell text-sm text-ink-3">{c.country}</td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <code className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">{c.externalId}</code>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-center text-sm text-ink-4">
                    {c._count?.matches ?? 0}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${c.isDisplayed ? 'bg-primary-400' : 'bg-gray-600'}`} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => toggle.mutate({ id: c.id, isDisplayed: !c.isDisplayed })}
                      disabled={toggle.isPending}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border ml-auto transition-colors ${
                        c.isDisplayed
                          ? 'border-overlay/[0.14] text-ink-4 hover:border-red-500/40 hover:text-red-400'
                          : 'border-primary-500/30 text-primary-400 hover:bg-primary-500/10'
                      }`}
                    >
                      {c.isDisplayed ? <><EyeOff size={12} /> Masquer</> : <><Eye size={12} /> Afficher</>}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
