import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, UserX, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const PLAN_STYLE = {
  FREE:    'bg-gray-500/15 text-gray-400 border border-gray-500/20',
  PREMIUM: 'bg-primary-500/15 text-primary-400 border border-primary-500/20',
  PRO:     'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter, page],
    queryFn: () => api.get('/admin/users', {
      params: { page, limit: 20, ...(search && { search }), ...(planFilter && { plan: planFilter }) },
    }).then((r) => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ userId, isActive }) => api.patch(`/admin/users/${userId}/status`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* En-tête */}
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Utilisateurs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {pagination?.total !== undefined ? `${pagination.total} utilisateurs au total` : ''}
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <input
            type="search"
            className="w-full bg-surface-800 border border-surface-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-primary-500 transition-colors"
            placeholder="Rechercher par email ou pseudo…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            value={planFilter}
            onChange={(e) => { setPlanFilter(e.target.value); setPage(1); }}
            className="bg-surface-800 border border-surface-700 rounded-xl pl-8 pr-4 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-primary-500 transition-colors appearance-none"
          >
            <option value="">Tous les plans</option>
            <option value="FREE">Gratuit</option>
            <option value="PREMIUM">Premium</option>
            <option value="PRO">Pro</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div className="bg-surface-800 border border-surface-700 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-700 text-xs text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-medium">Utilisateur</th>
                <th className="text-left px-4 py-3.5 font-medium">Plan</th>
                <th className="text-left px-4 py-3.5 font-medium hidden lg:table-cell">Pronos</th>
                <th className="text-left px-4 py-3.5 font-medium hidden lg:table-cell">Inscrit le</th>
                <th className="text-left px-4 py-3.5 font-medium">Statut</th>
                <th className="text-right px-5 py-3.5 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-700">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 bg-surface-700 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
                : users.map((u) => {
                  const plan = u.subscription?.plan?.code || 'FREE';
                  return (
                    <tr key={u.id} className="hover:bg-surface-700/40 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
                            {u.username?.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">{u.profile?.displayName || u.username}</p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg ${PLAN_STYLE[plan] || PLAN_STYLE.FREE}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell">
                        <div>
                          <span className="text-sm text-gray-300">{u._count?.tips || 0}</span>
                          {u.tipsterStats && (
                            <span className="text-xs text-gray-600 ml-1.5">({u.tipsterStats.successRate?.toFixed(0)}%)</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 hidden lg:table-cell text-sm text-gray-500">
                        {format(new Date(u.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          u.isActive
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {u.isActive
                            ? <><UserCheck size={11} /> Actif</>
                            : <><UserX size={11} /> Suspendu</>
                          }
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => toggle.mutate({ userId: u.id, isActive: !u.isActive })}
                          disabled={toggle.isPending}
                          className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                            u.isActive
                              ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                              : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                          }`}
                        >
                          {u.isActive ? 'Suspendre' : 'Réactiver'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              }
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination?.pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-surface-700">
            <p className="text-xs text-gray-500">
              Page {page} sur {pagination.pages} — {pagination.total} utilisateurs
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-surface-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
