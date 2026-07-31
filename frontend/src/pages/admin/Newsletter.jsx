import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Download, Trash2, Search, Users, CheckCircle2, UserPlus, Send, X, History, Clock, XCircle } from 'lucide-react';
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

function ComposeModal({ activeCount, onClose, onSent }) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const sendMutation = useMutation({
    mutationFn: () => api.post('/newsletter/admin/broadcast', { subject, message }),
    onSuccess: (res) => {
      alert(res?.data?.message || 'Envoi lancé.');
      onSent?.();
      onClose();
    },
    onError: (e) => alert(e?.response?.data?.message || "Erreur lors de l'envoi"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-overlay/[0.08] p-5 space-y-4"
        style={{ background: 'var(--color-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-ink-1">Envoyer un email</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-overlay/[0.06] text-ink-3">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-ink-4">
          Cet email sera envoyé à <span className="text-ink-2 font-semibold">{activeCount}</span> abonné(s) actif(s).
        </p>
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1.5">Sujet</label>
          <input
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Ex : Les meilleurs pronostics de la semaine"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-ink-3 mb-1.5">Message</label>
          <textarea
            className="input min-h-[160px] resize-y"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Écris ton message ici. Chaque ligne devient un paragraphe."
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => {
              if (!subject.trim() || !message.trim()) {
                alert('Sujet et message sont requis.');
                return;
              }
              if (confirm(`Envoyer cet email à ${activeCount} abonné(s) ?`)) sendMutation.mutate();
            }}
            disabled={sendMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={14} /> {sendMutation.isPending ? 'Envoi…' : 'Envoyer'}
          </button>
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function CampaignsHistory() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-newsletter-campaigns', page],
    queryFn: () =>
      api.get('/newsletter/admin/campaigns', { params: { page, limit: 20 } }).then((r) => r.data),
  });

  const campaigns = data?.data || [];
  const pagination = data?.pagination || {};

  if (isLoading) {
    return <p className="text-sm text-ink-4 px-4 py-6 text-center">Chargement…</p>;
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-overlay/[0.06] p-6 text-center" style={{ background: 'var(--color-card)' }}>
        <p className="text-sm text-ink-4">Aucun email envoyé pour l'instant.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campaigns.map((c) => (
        <div key={c.id} className="rounded-2xl border border-overlay/[0.06] p-4" style={{ background: 'var(--color-card)' }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-1 truncate">{c.subject}</p>
              <p className="text-xs text-ink-4 mt-1 line-clamp-2 whitespace-pre-line">{c.message}</p>
            </div>
            <span
              className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full ${
                c.status === 'sent'
                  ? 'bg-primary-500/10 text-primary-400'
                  : 'bg-amber-500/10 text-amber-400'
              }`}
            >
              {c.status === 'sent' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
              {c.status === 'sent' ? 'Envoyé' : 'En cours'}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-3 text-xs text-ink-3">
            <span className="flex items-center gap-1"><Users size={12} /> {c.recipientCount} destinataire(s)</span>
            <span className="flex items-center gap-1 text-primary-400"><CheckCircle2 size={12} /> {c.sentCount} envoyé(s)</span>
            {c.failedCount > 0 && (
              <span className="flex items-center gap-1 text-red-400"><XCircle size={12} /> {c.failedCount} échec(s)</span>
            )}
            <span className="ml-auto">{format(new Date(c.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}</span>
          </div>
        </div>
      ))}

      {pagination.pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm pt-2">
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

export default function AdminNewsletter() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [composeOpen, setComposeOpen] = useState(false);
  const [tab, setTab] = useState('subscribers'); // subscribers | history

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
            onClick={() => setComposeOpen(true)}
            disabled={activeCount === 0}
            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
          >
            <Send size={14} /> Envoyer un email
          </button>
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

      <div className="flex items-center gap-1 p-1 rounded-xl w-fit" style={{ background: 'var(--color-card)' }}>
        <button
          onClick={() => setTab('subscribers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'subscribers' ? 'bg-primary-500/10 text-primary-400' : 'text-ink-3 hover:text-ink-1'
          }`}
        >
          <Users size={14} /> Abonnés
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            tab === 'history' ? 'bg-primary-500/10 text-primary-400' : 'text-ink-3 hover:text-ink-1'
          }`}
        >
          <History size={14} /> Historique des emails
        </button>
      </div>

      {tab === 'history' ? (
        <CampaignsHistory />
      ) : (
      <>
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
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
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
      </>
      )}

      {composeOpen && (
        <ComposeModal
          activeCount={activeCount}
          onClose={() => setComposeOpen(false)}
          onSent={() => qc.invalidateQueries({ queryKey: ['admin-newsletter-campaigns'] })}
        />
      )}
    </div>
  );
}
