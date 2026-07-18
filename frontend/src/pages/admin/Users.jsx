import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, UserCheck, UserX, ChevronLeft, ChevronRight, Filter, Download, Crown, X, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

// ── Modal activation Premium ──────────────────────────────────────────────────
function ActivateModal({ user, onClose, onConfirm, loading }) {
  const [planCode, setPlanCode] = useState('PREMIUM');
  const [months, setMonths]     = useState(1);
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div
        className="rounded-2xl border border-white/[0.11] p-6 max-w-sm w-full"
        style={{ background: 'var(--color-card)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Crown size={18} className="text-amber-400" />
            <h3 className="text-white font-bold text-base">Activer un abonnement</h3>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-gray-500 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-5">
          <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-sm font-bold">
            {user.username?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{user.profile?.displayName || user.username}</p>
            <p className="text-[11px] text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs text-gray-400 font-medium mb-2 block">Plan</label>
            <div className="flex gap-2">
              {[['PREMIUM', 'Premium', 'text-primary-400 bg-primary-500/15 border-primary-500/30'],
                ['LIFETIME', 'Lifetime', 'text-amber-400 bg-amber-500/15 border-amber-500/30']].map(([val, lbl, cls]) => (
                <button
                  key={val}
                  onClick={() => setPlanCode(val)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    planCode === val ? cls : 'border-white/[0.08] text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
          </div>

          {planCode !== 'LIFETIME' && (
            <div>
              <label className="text-xs text-gray-400 font-medium mb-2 block">Durée</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                      months === m
                        ? 'border-primary-500/40 bg-primary-500/15 text-primary-400'
                        : 'border-white/[0.08] text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    {m} mois
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button
            onClick={() => onConfirm(planCode, months)}
            disabled={loading}
            className="btn-primary flex-1 gap-2"
          >
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Crown size={14} />}
            Activer
          </button>
        </div>
      </div>
    </div>
  );
}

const PLAN_STYLE = {
  FREE:    'bg-gray-500/15 text-gray-400 border border-gray-500/20',
  PREMIUM: 'bg-primary-500/15 text-primary-400 border border-primary-500/20',
  PRO:     'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage] = useState(1);
  const [activateUser, setActivateUser] = useState(null);

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

  const activate = useMutation({
    mutationFn: ({ userId, planCode, months }) =>
      api.post(`/admin/users/${userId}/activate-subscription`, { planCode, months }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setActivateUser(null);
      alert('Abonnement activé avec succès !');
    },
    onError: (e) => alert(e?.response?.data?.message || 'Erreur lors de l\'activation'),
  });

  const users = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-gray-50">Utilisateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {pagination?.total !== undefined ? `${pagination.total} utilisateurs au total` : ''}
          </p>
        </div>
        <a
          href={`${import.meta.env.VITE_API_URL || ''}/api/admin/export/users`}
          download
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-surface-800 border border-surface-700 text-gray-300 hover:text-gray-100 hover:border-surface-600 transition-colors shrink-0"
        >
          <Download size={13} />
          Exporter CSV
        </a>
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
                            ? 'bg-primary-500/15 text-primary-400 border border-primary-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {u.isActive
                            ? <><UserCheck size={11} /> Actif</>
                            : <><UserX size={11} /> Suspendu</>
                          }
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActivateUser(u)}
                            title="Activer Premium manuellement"
                            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors"
                          >
                            <Crown size={11} /> Premium
                          </button>
                          <button
                            onClick={() => toggle.mutate({ userId: u.id, isActive: !u.isActive })}
                            disabled={toggle.isPending}
                            className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                              u.isActive
                                ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                : 'border-primary-500/30 text-primary-400 hover:bg-primary-500/10'
                            }`}
                          >
                            {u.isActive ? 'Suspendre' : 'Réactiver'}
                          </button>
                        </div>
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

      {/* Modal activation Premium */}
      {activateUser && (
        <ActivateModal
          user={activateUser}
          onClose={() => setActivateUser(null)}
          loading={activate.isPending}
          onConfirm={(planCode, months) => activate.mutate({ userId: activateUser.id, planCode, months })}
        />
      )}
    </div>
  );
}
