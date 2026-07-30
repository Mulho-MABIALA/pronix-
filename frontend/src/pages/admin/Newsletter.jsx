import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Download, Trash2, Search, Users, CheckCircle2, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

function StatCard({ icon: Icon, label, value, color = 'text-primary-400', bg = 'bg-primary-500/10' }) {
  return (
    <div className="rounded-2xl border border-overlay/[0.06] p-4" style={{ background: 'var(--color-card)' }}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
        <Icon size={16} className={color} />
      </div>
      <p className="text-lg font-bold text-ink-1 leading-tight truncate">{value}</p>
      <p className="text-xs text-ink-3 mt-0.5">{label}</p>
    </div>
  );
}

export default function AdminNewsletter() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter', search, page],
    queryFn: () =>
      api
        .get('/newsletter/admin/subscribers', { params: { search, page, limit: 50 } })
        .then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/newsletter/admin/subscribers/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-newsletter'] }),
  });

  const importMutation = useMutation({
    mutationFn: () => api.post('/newsletter/admin/import-users'),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['admin-newsletter'] });
      alert(res?.data?.message || 'Import terminé.');
    },
    onError: (e) => alert(e?.response?.data?.message || "Erreur lors de l'import"),
  });

  const subscribers = data?.data || [];
  const pagination = data?.pagination || {};
  const activeCount = data?.activeCount ?? 0;

  const handleExport = () => {
    window.open(`${api.defaults.baseURL}/newsletter/admin/export`, '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="font-display font-bold text-xl text-ink-1">Newsletter</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (confirm("Importer tous les emails des utilisateurs déjà inscrits sur fpronix dans la newsletter ?")) {
                importMutation.mutate();
              }
            }}
            disabled={importMutation.isPending}
            className="btn-secondary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <UserPlus size={14} /> {importMutation.isPending ? 'Import…' : 'Importer les utilisateurs'}
          </button>
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <Download size={14} /> Exporter CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon={Users} label="Abonnés actifs" value={activeCount} />
        <StatCard icon={CheckCircle2} label="Total (page)" value={pagination.total ?? 0} color="text-primary-400" />
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4" />
        <input
          className="input pl-9"
          placeholder="Rechercher un email…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <div className="rounded-2xl border border-overlay/[0.06] overflow-hidden" style={{ background: 'var(--color-card)' }}>
        {isLoading ? (
          <p className="text-sm text-ink-4 px-4 py-6 text-center">Chargement…</p>
        ) : subscribers.length === 0 ? (
          <p className="text-sm text-ink-4 px-4 py-6 text-center">Aucun abonné trouvé.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-overlay/[0.06]">
                  {['Email', 'Langue', 'Source', 'Statut', 'Inscrit le', ''].map((h) => (
                    <th key={h} className="px-4 py-2 text-left text-xs font-semibold text-ink-3 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-overlay/[0.04]">
                {subscribers.map((s) => (
                  <tr key={s.id} className="hover:bg-overlay/[0.02] transition-colors">
                    <td className="px-4 py-2.5 text-sm text-ink-1 flex items-center gap-2">
                      <Mail size={13} className="text-ink-4 shrink-0" /> {s.email}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-3 uppercase">{s.language}</td>
                    <td className="px-4 py-2.5 text-xs text-ink-3">{s.source || '—'}</td>
                    <td className="px-4 py-2.5 text-xs">
                      <span className={s.isActive ? 'text-primary-400' : 'text-ink-4'}>
                        {s.isActive ? 'Actif' : 'Désabonné'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-ink-3">
                      {format(new Date(s.createdAt), 'dd MMM yyyy', { locale: fr })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => {
                          if (confirm(`Supprimer ${s.email} de la newsletter ?`)) deleteMutation.mutate(s.id);
                        }}
                        className="p-1.5 rounded-lg text-danger-400 hover:bg-danger-500/10 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">
            ←
          </button>
          <span className="text-ink-3">{page} / {pagination.pages}</span>
          <button disabled={page >= pagination.pages} onClick={() => setPage((p) => p + 1)} className="btn-secondary px-3 py-1.5 disabled:opacity-40">
            →
          </button>
        </div>
      )}
    </div>
  );
}
