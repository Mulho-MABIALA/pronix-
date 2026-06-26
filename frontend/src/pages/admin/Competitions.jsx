import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Globe, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';

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
        <h1 className="font-display font-bold text-2xl text-gray-50">Compétitions</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {displayed} / {competitions.length} compétitions affichées
        </p>
      </div>

      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        {isLoading ? (
          <div className="divide-y divide-surface-700">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="h-4 w-4 bg-surface-700 rounded animate-pulse" />
                <div className="h-4 flex-1 bg-surface-700 rounded animate-pulse" />
                <div className="h-6 w-16 bg-surface-700 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Compétition</th>
                <th className="text-left px-4 py-3.5 font-medium hidden sm:table-cell">Pays</th>
                <th className="text-left px-4 py-3.5 font-medium hidden md:table-cell">ID FotMob</th>
                <th className="text-center px-4 py-3.5 font-medium hidden md:table-cell">Matchs</th>
                <th className="text-center px-4 py-3.5 font-medium">Affichée</th>
                <th className="text-right px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {competitions.map((c) => (
                <tr key={c.id} className={`hover:bg-surface-700/40 transition-colors ${!c.isDisplayed ? 'opacity-50' : ''}`}>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <Globe size={14} className="text-gray-600 shrink-0" />
                      <span className="text-sm font-medium text-gray-200">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 hidden sm:table-cell text-sm text-gray-500">{c.country}</td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <code className="text-xs text-primary-400 bg-primary-500/10 px-2 py-0.5 rounded">{c.externalId}</code>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell text-center text-sm text-gray-400">
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
                          ? 'border-gray-600 text-gray-400 hover:border-red-500/40 hover:text-red-400'
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
