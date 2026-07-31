import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Mail, Download, Trash2, Search, Users, CheckCircle2, UserPlus, Send, X, History, Clock, XCircle,
  UserCheck, Bold, Italic, Underline, Heading1, Heading2, List, ListOrdered, Link2, Undo2, Redo2, Eye, EyeOff,
} from 'lucide-react';
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

// ── Barre d'outils de l'éditeur riche ────────────────────────────────────────
// Éditeur volontairement léger (contentEditable + document.execCommand),
// suffisant pour du HTML basique (gras/italique/souligné/titres/listes/lien)
// sans dépendance externe. Le div éditable reste monté en permanence (juste
// masqué en mode "Prévisualiser") pour ne jamais perdre le contenu tapé.
function ToolbarButton({ icon: Icon, onClick, title }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()} // évite de perdre la sélection texte
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-lg text-ink-3 hover:text-ink-1 hover:bg-overlay/[0.06] transition-colors"
    >
      <Icon size={14} />
    </button>
  );
}

function ComposeModal({ activeCount, onClose, onSent }) {
  const [subject, setSubject] = useState('');
  const [recipientMode, setRecipientMode] = useState('all'); // 'all' | 'select'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [subSearch, setSubSearch] = useState('');
  const [preview, setPreview] = useState(false);
  const [content, setContent] = useState('');
  const editorRef = useRef(null);

  const { data: subsData, isLoading: subsLoading } = useQuery({
    queryKey: ['admin-newsletter-active-full'],
    queryFn: () =>
      api.get('/newsletter/admin/subscribers', { params: { active: true, limit: 200 } }).then((r) => r.data),
    enabled: recipientMode === 'select',
    staleTime: 60_000,
  });

  const allSubs = subsData?.data || [];
  const filteredSubs = subSearch
    ? allSubs.filter((s) => s.email.toLowerCase().includes(subSearch.toLowerCase()))
    : allSubs;

  const toggleSub = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAllFiltered = () => setSelectedIds(new Set(filteredSubs.map((s) => s.id)));

  const recipientCount = recipientMode === 'all' ? activeCount : selectedIds.size;

  const syncContent = () => setContent(editorRef.current?.innerHTML || '');

  const exec = (cmd, value) => {
    document.execCommand(cmd, false, value);
    editorRef.current?.focus();
    syncContent();
  };

  const handleLink = () => {
    const url = window.prompt('URL du lien :', 'https://');
    if (url) exec('createLink', url);
  };

  const sendMutation = useMutation({
    mutationFn: () =>
      api.post('/newsletter/admin/broadcast', {
        subject,
        content,
        ...(recipientMode === 'select' ? { recipientIds: [...selectedIds] } : {}),
      }),
    onSuccess: (res) => {
      alert(res?.data?.message || 'Envoi lancé.');
      onSent?.();
      onClose();
    },
    onError: (e) => alert(e?.response?.data?.message || "Erreur lors de l'envoi"),
  });

  const handleSend = () => {
    if (!subject.trim() || !content.trim()) {
      alert('Sujet et contenu sont requis.');
      return;
    }
    if (recipientCount === 0) {
      alert('Sélectionne au moins un destinataire.');
      return;
    }
    if (confirm(`Envoyer cette campagne à ${recipientCount} destinataire(s) ?`)) sendMutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-2xl border border-overlay/[0.08] flex flex-col max-h-[88vh]"
        style={{ background: 'var(--color-card)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-overlay/[0.06] shrink-0">
          <h2 className="font-display font-bold text-lg text-ink-1 flex items-center gap-2">
            <Send size={16} className="text-primary-400" /> Envoyer une campagne
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-overlay/[0.06] text-ink-3">
            <X size={18} />
          </button>
        </div>

        {/* Corps scrollable */}
        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-ink-3 mb-1.5">Sujet *</label>
            <input
              className="input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex : Les meilleurs pronostics de la semaine"
            />
          </div>

          {/* Destinataires */}
          <div>
            <p className="text-xs font-medium text-ink-3 mb-1.5">Destinataires</p>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setRecipientMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  recipientMode === 'all' ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30' : 'text-ink-3 bg-overlay/[0.04] border border-transparent hover:text-ink-1'
                }`}
              >
                <Users size={13} /> Tous les abonnés actifs ({activeCount})
              </button>
              <button
                type="button"
                onClick={() => setRecipientMode('select')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                  recipientMode === 'select' ? 'bg-primary-500/15 text-primary-400 border border-primary-500/30' : 'text-ink-3 bg-overlay/[0.04] border border-transparent hover:text-ink-1'
                }`}
              >
                <UserCheck size={13} /> Sélectionner
              </button>
            </div>

            {recipientMode === 'select' && (
              <div className="rounded-xl border border-overlay/[0.07] overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-overlay/[0.06]">
                  <Search size={13} className="text-ink-4 shrink-0" />
                  <input
                    value={subSearch}
                    onChange={(e) => setSubSearch(e.target.value)}
                    placeholder="Rechercher un abonné..."
                    className="flex-1 bg-transparent text-sm text-ink-2 placeholder-ph-b outline-none"
                  />
                  <button
                    type="button"
                    onClick={selectAllFiltered}
                    className="shrink-0 text-xs font-semibold text-primary-400 hover:text-primary-300"
                  >
                    Tout sélectionner
                  </button>
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {subsLoading ? (
                    <p className="text-xs text-ink-4 text-center py-4">Chargement…</p>
                  ) : filteredSubs.length === 0 ? (
                    <p className="text-xs text-ink-4 text-center py-4">Aucun abonné trouvé.</p>
                  ) : (
                    filteredSubs.map((s) => (
                      <label
                        key={s.id}
                        className="flex items-center gap-2.5 px-3 py-2 hover:bg-overlay/[0.03] cursor-pointer border-b border-overlay/[0.04] last:border-0"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(s.id)}
                          onChange={() => toggleSub(s.id)}
                          className="accent-primary-500"
                        />
                        <span className="text-sm text-ink-2 truncate">{s.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Contenu riche */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-ink-3">Contenu (HTML supporté) *</label>
              <button
                type="button"
                onClick={() => setPreview((v) => !v)}
                className="flex items-center gap-1 text-xs font-semibold text-primary-400 hover:text-primary-300"
              >
                {preview ? <EyeOff size={12} /> : <Eye size={12} />}
                {preview ? 'Édition' : 'Prévisualiser'}
              </button>
            </div>

            <div className="rounded-xl border border-overlay/[0.07] overflow-hidden">
              {!preview && (
                <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-overlay/[0.06] flex-wrap">
                  <ToolbarButton icon={Bold} title="Gras" onClick={() => exec('bold')} />
                  <ToolbarButton icon={Italic} title="Italique" onClick={() => exec('italic')} />
                  <ToolbarButton icon={Underline} title="Souligné" onClick={() => exec('underline')} />
                  <span className="w-px h-4 bg-overlay/[0.08] mx-1" />
                  <ToolbarButton icon={Heading1} title="Titre 1" onClick={() => exec('formatBlock', '<h2>')} />
                  <ToolbarButton icon={Heading2} title="Titre 2" onClick={() => exec('formatBlock', '<h3>')} />
                  <span className="w-px h-4 bg-overlay/[0.08] mx-1" />
                  <ToolbarButton icon={List} title="Liste à puces" onClick={() => exec('insertUnorderedList')} />
                  <ToolbarButton icon={ListOrdered} title="Liste numérotée" onClick={() => exec('insertOrderedList')} />
                  <ToolbarButton icon={Link2} title="Lien" onClick={handleLink} />
                  <span className="w-px h-4 bg-overlay/[0.08] mx-1" />
                  <ToolbarButton icon={Undo2} title="Annuler" onClick={() => exec('undo')} />
                  <ToolbarButton icon={Redo2} title="Rétablir" onClick={() => exec('redo')} />
                </div>
              )}

              {/* Éditeur — toujours monté, juste masqué en prévisualisation */}
              <div
                ref={editorRef}
                contentEditable
                onInput={syncContent}
                data-placeholder="Écris le contenu de ta campagne ici..."
                className={`min-h-[160px] max-h-64 overflow-y-auto px-3 py-2.5 text-sm text-ink-2 outline-none [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary-400 [&_a]:underline empty:before:content-[attr(data-placeholder)] empty:before:text-ph-b ${preview ? 'hidden' : ''}`}
              />

              {preview && (
                <div
                  className="min-h-[160px] max-h-64 overflow-y-auto px-3 py-2.5 text-sm text-ink-2 [&_h2]:text-lg [&_h2]:font-bold [&_h3]:text-base [&_h3]:font-bold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_a]:text-primary-400 [&_a]:underline"
                  dangerouslySetInnerHTML={{ __html: content || '<span class="text-ink-4">Rien à prévisualiser pour l\'instant.</span>' }}
                />
              )}
            </div>
          </div>
        </div>

        {/* Pied — compteur + actions */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t border-overlay/[0.06] shrink-0">
          <p className="text-xs text-ink-4">
            <span className="text-ink-2 font-semibold">{recipientCount}</span> destinataire(s) sélectionné(s)
          </p>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="btn-secondary text-sm">Annuler</button>
            <button
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
            >
              <Send size={14} /> {sendMutation.isPending ? 'Envoi…' : 'Envoyer'}
            </button>
          </div>
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
