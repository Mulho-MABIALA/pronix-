import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Lightbulb, RefreshCw } from 'lucide-react';
import api from '../../services/api';

const STATUS_MAP = {
  NEW:  { label: 'Nouvelle', color: 'bg-blue-500/15 text-blue-400' },
  READ: { label: 'Lue',      color: 'bg-emerald-500/15 text-emerald-400' },
};

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || STATUS_MAP.NEW;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold ${s.color}`}>
      {s.label}
    </span>
  );
}

export default function AdminSuggestions() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin-suggestions', statusFilter],
    queryFn: () => api.get(`/admin/suggestions${statusFilter ? `?status=${statusFilter}` : ''}`).then((r) => r.data),
  });

  const suggestions = data?.data || [];
  const newCount = data?.newCount || 0;

  const markRead = useMutation({
    mutationFn: (id) => api.patch(`/admin/suggestions/${id}/status`, { status: 'READ' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-suggestions'] }),
  });

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-1">Suggestions</h1>
          <p className="text-sm text-ink-4 mt-0.5">
            {newCount > 0
              ? <span className="text-blue-400 font-semibold">{newCount} suggestion{newCount > 1 ? 's' : ''} non lue{newCount > 1 ? 's' : ''}</span>
              : 'Toutes les suggestions ont été lues ✓'}
          </p>
        </div>
        <button onClick={() => refetch()} disabled={isFetching} className="btn-secondary gap-2 text-sm py-2 px-3">
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[['', 'Toutes'], ['NEW', 'Nouvelles'], ['READ', 'Lues']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className="filter-chip"
            data-active={statusFilter === val ? 'true' : 'false'}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="rounded-2xl border border-overlay/[0.11] p-12 text-center" style={{ background: 'var(--color-card)' }}>
          <Lightbulb size={32} className="text-ink-4 mx-auto mb-3" />
          <p className="text-ink-4 font-medium">Aucune suggestion</p>
          <p className="text-sm text-ink-4 mt-1">Les idées des utilisateurs apparaîtront ici</p>
        </div>
      ) : (
        <div className="space-y-3">
          {suggestions.map((s) => {
            const displayName = s.user?.profile?.displayName || s.user?.username || s.user?.email;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-overlay/[0.11] p-4 shine-subtle"
                style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.06)' }}
                onClick={() => s.status === 'NEW' && markRead.mutate(s.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-ink-1 leading-relaxed">{s.message}</p>
                    <p className="text-[11px] text-ink-3 mt-1.5">
                      {displayName} · {format(new Date(s.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}
                    </p>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
