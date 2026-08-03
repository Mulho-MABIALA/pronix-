import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ScrollText, Search, ChevronLeft, ChevronRight, RefreshCw, Filter } from 'lucide-react';
import api from '../../services/api';

const ACTION_STYLES = {
  USER_SUSPENDED:                  { label: 'Compte suspendu',           cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  USER_REACTIVATED:                { label: 'Compte réactivé',           cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  USER_DELETED:                    { label: 'Compte supprimé',           cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  USER_ROLE_CHANGED:                { label: 'Rôle modifié',              cls: 'bg-violet-500/15 text-violet-400 border-violet-500/20' },
  SUBSCRIPTION_CANCELLED:          { label: 'Abonnement annulé',         cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  SUBSCRIPTION_ACTIVATED_MANUALLY: { label: 'Abonnement activé (manuel)', cls: 'bg-primary-500/15 text-primary-400 border-primary-500/20' },
  REPORT_RESOLVED:                 { label: 'Signalement traité',        cls: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  TIP_DELETED:                     { label: 'Pronostic supprimé',        cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  TIP_SHOWN:                       { label: 'Pronostic affiché',         cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  TIP_HIDDEN:                      { label: 'Pronostic masqué',          cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
  COMMENT_DELETED:                 { label: 'Commentaire supprimé',      cls: 'bg-red-500/15 text-red-400 border-red-500/20' },
  PAYMENT_REFUNDED:                { label: 'Paiement remboursé',        cls: 'bg-amber-500/15 text-amber-400 border-amber-500/20' },
};

function actionStyle(action) {
  return ACTION_STYLES[action] || { label: action, cls: 'bg-overlay/[0.08] text-ink-3 border-overlay/[0.1]' };
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-audit-log', page, search, actionFilter],
    queryFn: () => {
      const params = new URLSearchParams({ page, limit: 30 });
      if (search) params.set('search', search);
      if (actionFilter) params.set('action', actionFilter);
      return api.get(`/admin/audit-log?${params}`).then((r) => r.data);
    },
    keepPreviousData: true,
  });

  const items = data?.data || [];
  const pagination = data?.pagination;

  function handleSearch(e) {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Header */}
      <div>
        <h1 className="font-display font-bold text-2xl text-ink-1 flex items-center gap-2">
          <ScrollText size={22} className="text-primary-400" />
          Journal d'audit
        </h1>
        <p className="text-sm text-ink-4 mt-0.5">
          {pagination ? `${pagination.total} action${pagination.total > 1 ? 's' : ''} enregistrée${pagination.total > 1 ? 's' : ''}` : 'Traçabilité des actions admin sensibles'}
        </p>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <form onSubmit={handleSearch} className="flex gap-2 max-w-md flex-1 min-w-[220px]">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Chercher par email admin…"
              className="input pl-9 h-9 text-sm"
            />
          </div>
          <button type="submit" className="btn-secondary py-1.5 px-3 text-sm">
            <Filter size={14} />
          </button>
        </form>

        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[180px] h-9 text-sm px-3 appearance-none"
        >
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_STYLES).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div
        className="rounded-2xl border border-overlay/[0.11] overflow-hidden shine-subtle"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.06)' }}
      >
        {isLoading || isFetching ? (
          <div className="p-8 flex justify-center">
            <RefreshCw size={20} className="animate-spin text-ink-3" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText size={32} className="text-ink-4 mx-auto mb-3" />
            <p className="text-ink-4 font-medium">Aucune action enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-overlay/[0.05]">
            {items.map((log) => {
              const style = actionStyle(log.action);
              return (
                <div key={log.id} className="flex items-start gap-3 p-4 hover:bg-overlay/[0.02] transition-colors">
                  <span className={`shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${style.cls}`}>
                    {style.label}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-2">
                      <span className="font-semibold text-ink-1">{log.adminEmail}</span>
                      {log.details && <span className="text-ink-4"> — {log.details}</span>}
                    </p>
                    <p className="text-[11px] text-ink-4 mt-0.5">
                      {format(new Date(log.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                      {log.targetType && ` · ${log.targetType}${log.targetId ? ` #${log.targetId.slice(0, 8)}` : ''}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-overlay/[0.07]">
            <p className="text-[12px] text-ink-3">
              Page {pagination.page} / {pagination.pages} · {pagination.total} total
            </p>
            <div className="flex gap-1.5">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-overlay/[0.08] text-ink-4 hover:text-ink-1 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                disabled={page >= pagination.pages}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-overlay/[0.08] text-ink-4 hover:text-ink-1 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
