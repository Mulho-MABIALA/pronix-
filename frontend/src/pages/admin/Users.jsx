import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, UserCheck, UserX, ChevronLeft, ChevronRight, Filter, Download,
  Crown, X, RefreshCw, Mail, Calendar, Target, TrendingUp, Shield,
  CheckCircle, XCircle, Copy, Gift, Clock,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const PLAN_STYLE = {
  FREE:     'bg-gray-500/15 text-gray-400 border border-gray-500/20',
  PREMIUM:  'bg-primary-500/15 text-primary-400 border border-primary-500/20',
  LIFETIME: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  PRO:      'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

// ── Avatar helper ─────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 'sm' }) {
  const dim   = size === 'lg' ? 'w-16 h-16 text-2xl' : 'w-8 h-8 text-xs';
  const avatar = user.profile?.avatar;
  const letter = (user.profile?.displayName || user.username)?.charAt(0).toUpperCase();
  return avatar ? (
    <img src={avatar} alt="" className={`${dim} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${dim} rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0`}>
      {letter}
    </div>
  );
}

// ── Modal detail utilisateur ──────────────────────────────────────────────────
function UserDetailModal({ user, onClose, onActivate, onToggle, activating, toggling }) {
  const plan     = user.subscription?.plan?.code || 'FREE';
  const subEnds  = user.subscription?.endsAt;
  const isPremium = plan !== 'FREE';

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl border border-white/[0.12] w-full max-w-lg max-h-[90vh] overflow-y-auto"
        style={{ background: 'var(--color-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-white/[0.07]">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="lg" />
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                {user.profile?.displayName || user.username}
              </h2>
              <p className="text-sm text-gray-400">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${PLAN_STYLE[plan] || PLAN_STYLE.FREE}`}>
                  {plan}
                </span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {user.isActive ? <UserCheck size={10} /> : <UserX size={10} />}
                  {user.isActive ? 'Actif' : 'Suspendu'}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/[0.08] text-gray-500 hover:text-gray-300 transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Infos */}
        <div className="p-5 space-y-4">

          {/* Contact */}
          <div className="rounded-xl border border-white/[0.07] p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Contact</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-500" />
                <span className="text-sm text-gray-200">{user.email}</span>
              </div>
              <div className="flex items-center gap-2">
                {user.emailVerified
                  ? <span className="flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle size={11} /> Vérifié</span>
                  : <span className="flex items-center gap-1 text-[11px] text-amber-400"><XCircle size={11} /> Non vérifié</span>
                }
                <button onClick={() => copyToClipboard(user.email)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.08] text-gray-600 hover:text-gray-300 transition-colors">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>

          {/* Abonnement */}
          <div className="rounded-xl border border-white/[0.07] p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Abonnement</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[11px] text-gray-600 mb-0.5">Plan actuel</p>
                <p className="text-sm font-semibold text-white">{plan}</p>
              </div>
              {subEnds && (
                <div>
                  <p className="text-[11px] text-gray-600 mb-0.5">Expiration</p>
                  <p className="text-sm font-semibold text-white">
                    {new Date(subEnds) > new Date('2099-01-01')
                      ? 'À vie ♾️'
                      : format(new Date(subEnds), 'dd MMM yyyy', { locale: fr })
                    }
                  </p>
                </div>
              )}
              <div>
                <p className="text-[11px] text-gray-600 mb-0.5">Statut sub</p>
                <p className="text-sm font-semibold text-white capitalize">
                  {user.subscription?.status?.toLowerCase() || 'Aucun'}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-gray-600 mb-0.5">Inscrit il y a</p>
                <p className="text-sm font-semibold text-white">
                  {formatDistanceToNow(new Date(user.createdAt), { locale: fr })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats tipster */}
          <div className="rounded-xl border border-white/[0.07] p-4 space-y-3"
            style={{ background: 'rgba(255,255,255,0.02)' }}>
            <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider">Activité</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center">
                <p className="text-xl font-display font-bold text-white">{user._count?.tips || 0}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">Pronos</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-display font-bold text-white">
                  {user.tipsterStats?.successRate != null
                    ? `${user.tipsterStats.successRate.toFixed(0)}%`
                    : '—'
                  }
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Réussite</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-display font-bold text-white">
                  {user.tipsterStats?.totalTips || 0}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">Total tips</p>
              </div>
            </div>
          </div>

          {/* Parrainage */}
          {user.referralCode && (
            <div className="rounded-xl border border-white/[0.07] p-4"
              style={{ background: 'rgba(255,255,255,0.02)' }}>
              <p className="text-[11px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Parrainage</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift size={14} className="text-violet-400" />
                  <span className="text-sm text-gray-200 font-mono">{user.referralCode}</span>
                </div>
                <button onClick={() => copyToClipboard(user.referralCode)}
                  className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/[0.08] text-gray-600 hover:text-gray-300 transition-colors">
                  <Copy size={12} />
                </button>
              </div>
            </div>
          )}

          {/* Dates */}
          <div className="flex items-center gap-2 text-[11px] text-gray-600">
            <Calendar size={12} />
            Inscrit le {format(new Date(user.createdAt), 'dd MMMM yyyy à HH:mm', { locale: fr })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-5 pt-0">
          <button
            onClick={() => onActivate(user)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-semibold transition-colors"
          >
            <Crown size={14} />
            Activer Premium
          </button>
          <button
            onClick={() => onToggle(user)}
            disabled={toggling}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-semibold transition-colors disabled:opacity-40 ${
              user.isActive
                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {toggling ? <RefreshCw size={14} className="animate-spin" /> : user.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
            {user.isActive ? 'Suspendre' : 'Réactiver'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal activation Premium ──────────────────────────────────────────────────
function ActivateModal({ user, onClose, onConfirm, loading }) {
  const [planCode, setPlanCode] = useState('PREMIUM');
  const [months, setMonths]     = useState(1);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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
          <UserAvatar user={user} />
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
                ['LIFETIME', 'Lifetime ♾️', 'text-amber-400 bg-amber-500/15 border-amber-500/30']].map(([val, lbl, cls]) => (
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

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [page, setPage]             = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activateUser, setActivateUser] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter, page],
    queryFn: () => api.get('/admin/users', {
      params: { page, limit: 20, ...(search && { search }), ...(planFilter && { plan: planFilter }) },
    }).then(r => r.data),
  });

  const toggle = useMutation({
    mutationFn: ({ userId, isActive }) => api.patch(`/admin/users/${userId}/status`, { isActive }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setSelectedUser(null);
    },
  });

  const activate = useMutation({
    mutationFn: ({ userId, planCode, months }) =>
      api.post(`/admin/users/${userId}/activate-subscription`, { planCode, months }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      setActivateUser(null);
      setSelectedUser(null);
    },
    onError: (e) => alert(e?.response?.data?.message || 'Erreur lors de l\'activation'),
  });

  const users      = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-white">Utilisateurs</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {pagination?.total !== undefined ? `${pagination.total} utilisateurs au total` : ''}
          </p>
        </div>
        <a
          href={`${import.meta.env.VITE_API_URL || ''}/api/admin/export/users`}
          download
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-white/[0.05] border border-white/[0.11] text-gray-300 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
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
            className="input pl-9 h-10 text-sm"
            placeholder="Rechercher par email ou pseudo…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="relative">
          <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          <select
            value={planFilter}
            onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
            className="input pl-8 h-10 text-sm pr-4 appearance-none"
            style={{ width: 'auto' }}
          >
            <option value="">Tous les plans</option>
            <option value="FREE">Gratuit</option>
            <option value="PREMIUM">Premium</option>
            <option value="LIFETIME">Lifetime</option>
          </select>
        </div>
      </div>

      {/* Tableau */}
      <div
        className="rounded-2xl border border-white/[0.11] overflow-hidden"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.07] text-[11px] text-gray-500 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-semibold">Utilisateur</th>
                <th className="text-left px-4 py-3.5 font-semibold">Plan</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Pronos</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Inscrit le</th>
                <th className="text-left px-4 py-3.5 font-semibold">Statut</th>
                <th className="text-right px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-4 skeleton rounded" />
                      </td>
                    ))}
                  </tr>
                ))
                : users.map(u => {
                  const plan = u.subscription?.plan?.code || 'FREE';
                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-white/[0.025] transition-colors cursor-pointer"
                      onClick={() => setSelectedUser(u)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={u} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-200 truncate">
                              {u.profile?.displayName || u.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg ${PLAN_STYLE[plan] || PLAN_STYLE.FREE}`}>
                          {plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-gray-300">{u._count?.tips || 0}</span>
                        {u.tipsterStats && (
                          <span className="text-xs text-gray-600 ml-1.5">({u.tipsterStats.successRate?.toFixed(0)}%)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-sm text-gray-500">
                        {format(new Date(u.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          u.isActive
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                            : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {u.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                          {u.isActive ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setActivateUser(u)}
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
                                : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
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
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-white/[0.07]">
            <p className="text-xs text-gray-500">
              Page {page} sur {pagination.pages} — {pagination.total} utilisateurs
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.06] disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal détail utilisateur */}
      {selectedUser && !activateUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          toggling={toggle.isPending}
          onActivate={(u) => { setActivateUser(u); }}
          onToggle={(u) => toggle.mutate({ userId: u.id, isActive: !u.isActive })}
        />
      )}

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
