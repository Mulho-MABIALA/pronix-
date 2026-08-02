import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search, UserCheck, UserX, ChevronLeft, ChevronRight, Filter, Download,
  Crown, X, RefreshCw, Mail, Calendar, Target, TrendingUp, Shield,
  CheckCircle, XCircle, Copy, Gift, Clock, Users, CreditCard,
  MessageSquare, ArrowUpDown, StickyNote, Send, AlertTriangle,
  ChevronDown, ExternalLink, Star, Trash2, Smartphone,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { COUNTRIES } from '../../data/countries';

const PLAN_STYLE = {
  FREE:     'bg-gray-500/15 text-ink-4 border border-gray-500/20',
  PREMIUM:  'bg-primary-500/15 text-primary-400 border border-primary-500/20',
  LIFETIME: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
  PRO:      'bg-amber-500/15 text-amber-400 border border-amber-500/20',
};

const PRED_LABELS = {
  HOME_WIN: '1', DRAW: 'X', AWAY_WIN: '2',
  OVER_2_5: '+2.5', UNDER_2_5: '-2.5', BTTS_YES: 'BTTS✓', BTTS_NO: 'BTTS✗',
};

const LANG_LABELS = { fr: 'FR', en: 'EN', es: 'ES', pt: 'PT' };

const COUNTRY_BY_CODE = Object.fromEntries(COUNTRIES.map((c) => [c.code, c]));

function LangBadge({ user }) {
  const lang = LANG_LABELS[user.language] || 'FR';
  return <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-overlay/[0.06] text-ink-3">{lang}</span>;
}

function CurrencyBadge({ user }) {
  const currency = user.currency || 'auto';
  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-overlay/[0.03] text-ink-4">{currency}</span>;
}

function CountryBadge({ user }) {
  const country = user.country ? COUNTRY_BY_CODE[user.country] : null;
  if (!country) {
    return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-overlay/[0.03] text-ink-5">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-1.5 py-0.5 rounded bg-overlay/[0.03] text-ink-3 whitespace-nowrap">
      <span>{country.flag}</span>
      <span>{country.label}</span>
    </span>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 'sm' }) {
  const dim    = size === 'lg' ? 'w-16 h-16 text-2xl' : size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  const avatar = user.profile?.avatar;
  const letter = (user.profile?.displayName || user.username)?.charAt(0).toUpperCase();
  return avatar
    ? <img src={avatar} alt="" className={`${dim} rounded-full object-cover shrink-0`} />
    : <div className={`${dim} rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 font-bold shrink-0`}>{letter}</div>;
}

function StatCard({ label, value, icon: Icon, color = 'text-primary-400' }) {
  return (
    <div className="rounded-xl border border-overlay/[0.09] p-4 flex items-center gap-3 shine-subtle"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.06)' }}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color} bg-current/10`}
        style={{ background: 'rgba(var(--tw-ring-color,0,0,0),0.08)' }}>
        <Icon size={16} className={color} />
      </div>
      <div>
        <p className="text-xl font-bold text-ink-1 leading-none">{value ?? '—'}</p>
        <p className="text-[11px] text-ink-3 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Modal détail utilisateur ──────────────────────────────────────────────────
const TABS = ['Infos', 'Pronos', 'Paiements', 'Référés'];

function UserDetailModal({ user, onClose, onActivate, qc }) {
  const [tab, setTab]   = useState('Infos');
  const [note, setNote] = useState(user.adminNote || '');
  const [noteEditing, setNoteEditing] = useState(false);
  const [emailOpen, setEmailOpen]     = useState(false);
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody]       = useState('');

  const plan    = user.subscription?.plan?.code || 'FREE';
  const subEnds = user.subscription?.endsAt;

  function copyText(t) { navigator.clipboard.writeText(t).catch(() => {}); }

  const toggle = useMutation({
    mutationFn: () => api.patch(`/admin/users/${user.id}/status`, { isActive: !user.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); },
  });

  const changeRole = useMutation({
    mutationFn: (role) => api.patch(`/admin/users/${user.id}/role`, { role }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); },
  });

  const cancelSub = useMutation({
    mutationFn: () => api.delete(`/admin/users/${user.id}/subscription`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const deleteUser = useMutation({
    mutationFn: () => api.delete(`/admin/users/${user.id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); onClose(); },
    onError: (e) => alert(e?.response?.data?.message || 'Erreur lors de la suppression'),
  });

  const saveNote = useMutation({
    mutationFn: () => api.patch(`/admin/users/${user.id}/note`, { note }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setNoteEditing(false); },
  });

  const sendEmail = useMutation({
    mutationFn: () => api.post(`/admin/users/${user.id}/send-email`, { subject: emailSubject, message: emailBody }),
    onSuccess: () => { setEmailOpen(false); setEmailSubject(''); setEmailBody(''); },
    onError: (e) => alert(e?.response?.data?.message || 'Erreur envoi email'),
  });

  const { data: tipsData } = useQuery({
    queryKey: ['admin-user-tips', user.id],
    queryFn: () => api.get(`/admin/users/${user.id}/tips`).then(r => r.data),
    enabled: tab === 'Pronos',
  });

  const { data: paymentsData } = useQuery({
    queryKey: ['admin-user-payments', user.id],
    queryFn: () => api.get(`/admin/users/${user.id}/payments`).then(r => r.data),
    enabled: tab === 'Paiements',
  });

  const { data: referralsData } = useQuery({
    queryKey: ['admin-user-referrals', user.id],
    queryFn: () => api.get(`/admin/users/${user.id}/referrals`).then(r => r.data),
    enabled: tab === 'Référés',
  });

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="rounded-2xl border border-overlay/[0.12] w-full max-w-2xl max-h-[92vh] flex flex-col"
        style={{ background: 'var(--color-card)', boxShadow: '0 24px 64px rgb(var(--surface-900-rgb) / 0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-overlay/[0.07] shrink-0">
          <div className="flex items-center gap-4">
            <UserAvatar user={user} size="lg" />
            <div>
              <h2 className="text-ink-1 font-bold text-lg leading-tight">{user.profile?.displayName || user.username}</h2>
              <p className="text-sm text-ink-4">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${PLAN_STYLE[plan] || PLAN_STYLE.FREE}`}>{plan}</span>
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.isActive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                }`}>
                  {user.isActive ? <UserCheck size={10} /> : <UserX size={10} />}
                  {user.isActive ? 'Actif' : 'Suspendu'}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.role === 'ADMIN' ? 'bg-violet-500/15 text-violet-400' : 'bg-gray-500/10 text-ink-3'
                }`}>
                  {user.role}
                </span>
                {user.lastLoginAt && (
                  <span className="text-[11px] text-ink-4 flex items-center gap-1">
                    <Clock size={10} /> {formatDistanceToNow(new Date(user.lastLoginAt), { locale: fr, addSuffix: true })}
                  </span>
                )}
                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.appInstalledAt ? 'bg-primary-500/15 text-primary-400' : 'bg-overlay/[0.05] text-ink-3'
                }`}>
                  <Smartphone size={10} />
                  {user.appInstalledAt
                    ? `App installée · ${format(new Date(user.appInstalledAt), 'dd MMM yyyy', { locale: fr })}`
                    : 'App non installée'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-overlay/[0.08] text-ink-3 hover:text-ink-2 transition-colors shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-5 pt-3 border-b border-overlay/[0.07] shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 -mb-px ${
                tab === t ? 'text-ink-1 border-primary-400' : 'text-ink-3 border-transparent hover:text-ink-2'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* ─── Onglet Infos ─── */}
          {tab === 'Infos' && (<>

            {/* Contact */}
            <div className="rounded-xl border border-overlay/[0.07] p-4 space-y-2" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
              <p className="text-[11px] text-ink-3 font-semibold uppercase tracking-wider mb-3">Contact</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail size={14} className="text-ink-3" />
                  <span className="text-sm text-ink-2">{user.email}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {user.emailVerified
                    ? <span className="flex items-center gap-1 text-[11px] text-emerald-400"><CheckCircle size={11} /> Vérifié</span>
                    : <span className="flex items-center gap-1 text-[11px] text-amber-400"><XCircle size={11} /> Non vérifié</span>
                  }
                  <button onClick={() => copyText(user.email)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-overlay/[0.08] text-ink-4 hover:text-ink-3">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
              <div className="text-[11px] text-ink-4 flex items-center gap-1 pt-1">
                <Calendar size={11} /> Inscrit le {format(new Date(user.createdAt), 'dd MMMM yyyy', { locale: fr })}
              </div>
            </div>

            {/* Abonnement */}
            <div className="rounded-xl border border-overlay/[0.07] p-4" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] text-ink-3 font-semibold uppercase tracking-wider">Abonnement</p>
                {plan !== 'FREE' && (
                  <button onClick={() => { if (confirm('Annuler l\'abonnement ?')) cancelSub.mutate(); }}
                    disabled={cancelSub.isPending}
                    className="text-[11px] text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                    {cancelSub.isPending ? <RefreshCw size={10} className="animate-spin" /> : <XCircle size={10} />}
                    Annuler abo
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-[11px] text-ink-4 mb-0.5">Plan</p><p className="text-sm font-semibold text-ink-1">{plan}</p></div>
                {subEnds && (
                  <div>
                    <p className="text-[11px] text-ink-4 mb-0.5">Expiration</p>
                    <p className="text-sm font-semibold text-ink-1">
                      {new Date(subEnds) > new Date('2099-01-01') ? 'À vie ♾️' : format(new Date(subEnds), 'dd MMM yyyy', { locale: fr })}
                    </p>
                  </div>
                )}
                <div><p className="text-[11px] text-ink-4 mb-0.5">Statut</p><p className="text-sm font-semibold text-ink-1 capitalize">{user.subscription?.status?.toLowerCase() || 'Aucun'}</p></div>
                <div><p className="text-[11px] text-ink-4 mb-0.5">Pronos</p><p className="text-sm font-semibold text-ink-1">{user._count?.tips || 0}</p></div>
              </div>
            </div>

            {/* Note admin */}
            <div className="rounded-xl border border-overlay/[0.07] p-4" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] text-ink-3 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <StickyNote size={12} /> Note admin (privée)
                </p>
                {!noteEditing && (
                  <button onClick={() => setNoteEditing(true)} className="text-[11px] text-primary-400 hover:text-primary-300 transition-colors">Modifier</button>
                )}
              </div>
              {noteEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Note interne visible uniquement par les admins…"
                    className="input w-full text-sm resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { setNote(user.adminNote || ''); setNoteEditing(false); }} className="btn-secondary text-xs py-1.5 px-3">Annuler</button>
                    <button onClick={() => saveNote.mutate()} disabled={saveNote.isPending} className="btn-primary text-xs py-1.5 px-3 gap-1.5">
                      {saveNote.isPending ? <RefreshCw size={12} className="animate-spin" /> : null} Enregistrer
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-ink-4 italic">{note || 'Aucune note'}</p>
              )}
            </div>

            {/* Code parrainage */}
            {user.referralCode && (
              <div className="rounded-xl border border-overlay/[0.07] p-4" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
                <p className="text-[11px] text-ink-3 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Gift size={12} /> Parrainage</p>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-ink-2 font-mono">{user.referralCode}</span>
                  <button onClick={() => copyText(user.referralCode)} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-overlay/[0.08] text-ink-4 hover:text-ink-3">
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            )}

            {/* Envoyer email */}
            <div className="rounded-xl border border-overlay/[0.07] p-4" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
              <button onClick={() => setEmailOpen(!emailOpen)}
                className="w-full flex items-center justify-between text-[11px] text-ink-3 font-semibold uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><Send size={12} /> Envoyer un email</span>
                <ChevronDown size={14} className={`transition-transform ${emailOpen ? 'rotate-180' : ''}`} />
              </button>
              {emailOpen && (
                <div className="mt-3 space-y-2">
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)}
                    placeholder="Objet de l'email…" className="input w-full text-sm" />
                  <textarea value={emailBody} onChange={e => setEmailBody(e.target.value)}
                    placeholder="Corps du message…" className="input w-full text-sm resize-none" rows={4} />
                  <button onClick={() => sendEmail.mutate()} disabled={sendEmail.isPending || !emailSubject || !emailBody}
                    className="btn-primary text-sm py-2 gap-2 w-full disabled:opacity-40">
                    {sendEmail.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                    Envoyer
                  </button>
                </div>
              )}
            </div>

          </>)}

          {/* ─── Onglet Pronos ─── */}
          {tab === 'Pronos' && (
            <div className="space-y-2">
              {!tipsData ? (
                <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin text-ink-3" /></div>
              ) : tipsData.data?.length === 0 ? (
                <div className="text-center py-8 text-ink-3"><Target size={28} className="mx-auto mb-2" /><p className="text-sm">Aucun pronostic</p></div>
              ) : tipsData.data.map(tip => (
                <div key={tip.id} className="rounded-xl border border-overlay/[0.07] p-3 flex items-center gap-3" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-1 font-medium truncate">{tip.match?.homeTeam} — {tip.match?.awayTeam}</p>
                    <p className="text-[11px] text-ink-4">{tip.match?.competition?.name} · {tip.match?.scheduledAt && format(new Date(tip.match.scheduledAt), 'dd MMM yyyy', { locale: fr })}</p>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded-md bg-overlay/[0.07] text-ink-3">{PRED_LABELS[tip.prediction] || tip.prediction}</span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    tip.result === 'WIN' ? 'bg-emerald-500/15 text-emerald-400' :
                    tip.result === 'LOSS' ? 'bg-red-500/15 text-red-400' :
                    'bg-gray-500/10 text-ink-3'
                  }`}>{tip.result || '⏳'}</span>
                  <span className="text-[11px] text-ink-4 flex items-center gap-1"><MessageSquare size={10} /> {tip._count?.comments || 0}</span>
                </div>
              ))}
            </div>
          )}

          {/* ─── Onglet Paiements ─── */}
          {tab === 'Paiements' && (
            <div className="space-y-2">
              {!paymentsData ? (
                <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin text-ink-3" /></div>
              ) : paymentsData.data?.length === 0 ? (
                <div className="text-center py-8 text-ink-3"><CreditCard size={28} className="mx-auto mb-2" /><p className="text-sm">Aucun paiement</p></div>
              ) : paymentsData.data.map(p => (
                <div key={p.id} className="rounded-xl border border-overlay/[0.07] p-3 flex items-center gap-3" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
                  <div className="flex-1">
                    <p className="text-sm text-ink-1 font-medium">{p.subscription?.plan?.name || 'Plan inconnu'}</p>
                    <p className="text-[11px] text-ink-4">{format(new Date(p.createdAt), 'dd MMM yyyy à HH:mm', { locale: fr })}</p>
                  </div>
                  <p className="text-sm font-bold text-ink-1">{p.amount}€</p>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    p.status === 'COMPLETED' ? 'bg-emerald-500/15 text-emerald-400' :
                    p.status === 'FAILED' ? 'bg-red-500/15 text-red-400' :
                    'bg-amber-500/15 text-amber-400'
                  }`}>{p.status}</span>
                </div>
              ))}
            </div>
          )}

          {/* ─── Onglet Référés ─── */}
          {tab === 'Référés' && (
            <div className="space-y-2">
              {!referralsData ? (
                <div className="flex justify-center py-8"><RefreshCw size={18} className="animate-spin text-ink-3" /></div>
              ) : referralsData.data?.length === 0 ? (
                <div className="text-center py-8 text-ink-3"><Users size={28} className="mx-auto mb-2" /><p className="text-sm">Aucun filleul</p></div>
              ) : referralsData.data.map(r => (
                <div key={r.id} className="rounded-xl border border-overlay/[0.07] p-3 flex items-center gap-3" style={{ background: 'rgb(var(--overlay-rgb) / 0.02)' }}>
                  <UserAvatar user={r.referee} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ink-1 font-medium">{r.referee.profile?.displayName || r.referee.username}</p>
                    <p className="text-[11px] text-ink-4">Inscrit {formatDistanceToNow(new Date(r.referee.createdAt), { locale: fr, addSuffix: true })}</p>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${PLAN_STYLE[r.referee.subscription?.plan?.code || 'FREE']}`}>
                    {r.referee.subscription?.plan?.code || 'FREE'}
                  </span>
                </div>
              ))}
            </div>
          )}

        </div>

        {/* Actions footer */}
        <div className="flex gap-2 p-5 pt-0 border-t border-overlay/[0.07] shrink-0 mt-2 flex-wrap">
          <button onClick={() => onActivate(user)}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors">
            <Crown size={13} /> Activer Premium
          </button>
          <button
            onClick={() => { if (confirm(`Passer ${user.username} en ${user.role === 'ADMIN' ? 'USER' : 'ADMIN'} ?`)) changeRole.mutate(user.role === 'ADMIN' ? 'USER' : 'ADMIN'); }}
            disabled={changeRole.isPending}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40 ${
              user.role === 'ADMIN'
                ? 'border-gray-500/30 bg-gray-500/10 text-ink-4 hover:bg-gray-500/20'
                : 'border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20'
            }`}
          >
            <Shield size={13} /> {user.role === 'ADMIN' ? 'Rétrograder USER' : 'Passer ADMIN'}
          </button>
          <button onClick={() => toggle.mutate()} disabled={toggle.isPending}
            className={`flex items-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-40 ${
              user.isActive
                ? 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
            }`}
          >
            {toggle.isPending ? <RefreshCw size={13} className="animate-spin" /> : user.isActive ? <UserX size={13} /> : <UserCheck size={13} />}
            {user.isActive ? 'Suspendre' : 'Réactiver'}
          </button>
          <Link to={`/admin/support?userId=${user.id}`}
            className="flex items-center gap-1.5 py-2 px-3 rounded-xl border border-overlay/[0.09] text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.05] text-xs font-semibold transition-colors">
            <MessageSquare size={13} /> Support
          </Link>
          <button
            onClick={() => {
              if (confirm(`Supprimer définitivement le compte de ${user.username} ? Cette action est irréversible.`)) {
                deleteUser.mutate();
              }
            }}
            disabled={deleteUser.isPending}
            className="ml-auto flex items-center gap-1.5 py-2 px-3 rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-semibold transition-colors disabled:opacity-40"
          >
            {deleteUser.isPending ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
            Supprimer
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
      <div className="rounded-2xl border border-overlay/[0.11] p-6 max-w-sm w-full" style={{ background: 'var(--color-card)' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2"><Crown size={18} className="text-amber-400" /><h3 className="text-ink-1 font-bold text-base">Activer un abonnement</h3></div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-overlay/[0.08] text-ink-3 transition-colors"><X size={15} /></button>
        </div>
        <div className="flex items-center gap-3 p-3 rounded-xl bg-overlay/[0.04] border border-overlay/[0.08] mb-5">
          <UserAvatar user={user} />
          <div>
            <p className="text-sm font-semibold text-ink-1">{user.profile?.displayName || user.username}</p>
            <p className="text-[11px] text-ink-3">{user.email}</p>
          </div>
        </div>
        <div className="space-y-4 mb-6">
          <div>
            <label className="text-xs text-ink-4 font-medium mb-2 block">Plan</label>
            <div className="flex gap-2">
              {[['PREMIUM','Premium','text-primary-400 bg-primary-500/15 border-primary-500/30'],
                ['LIFETIME','Lifetime ♾️','text-amber-400 bg-amber-500/15 border-amber-500/30']].map(([val,lbl,cls]) => (
                <button key={val} onClick={() => setPlanCode(val)}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${planCode === val ? cls : 'border-overlay/[0.08] text-ink-3 hover:text-ink-2'}`}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
          {planCode !== 'LIFETIME' && (
            <div>
              <label className="text-xs text-ink-4 font-medium mb-2 block">Durée</label>
              <div className="flex gap-2 flex-wrap">
                {[1,3,6,12].map(m => (
                  <button key={m} onClick={() => setMonths(m)}
                    className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${months === m ? 'border-primary-500/40 bg-primary-500/15 text-primary-400' : 'border-overlay/[0.08] text-ink-3 hover:text-ink-2'}`}>
                    {m} mois
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Annuler</button>
          <button onClick={() => onConfirm(planCode, months)} disabled={loading} className="btn-primary flex-1 gap-2">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Crown size={14} />} Activer
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: 'Tous', value: '' },
  { label: 'Cette semaine', value: () => new Date(Date.now() - 7*24*60*60*1000).toISOString() },
  { label: 'Ce mois', value: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString() },
  { label: 'Ce trimestre', value: () => new Date(Date.now() - 90*24*60*60*1000).toISOString() },
];

const ORDER_OPTIONS = [
  { label: 'Plus récents', orderBy: 'createdAt', order: 'desc' },
  { label: 'Plus anciens', orderBy: 'createdAt', order: 'asc' },
  { label: 'Plus de pronos', orderBy: 'tips', order: 'desc' },
];

export default function AdminUsers() {
  const qc = useQueryClient();
  const [search, setSearch]         = useState('');
  const [planFilter, setPlanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [datePreset, setDatePreset] = useState(0);
  const [sortIdx, setSortIdx]       = useState(0);
  const [page, setPage]             = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [activateUser, setActivateUser] = useState(null);

  const sort         = ORDER_OPTIONS[sortIdx];
  const createdAfter = typeof DATE_PRESETS[datePreset].value === 'function'
    ? DATE_PRESETS[datePreset].value()
    : '';

  const { data: statsData } = useQuery({
    queryKey: ['admin-user-stats'],
    queryFn: () => api.get('/admin/users/stats').then(r => r.data.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', search, planFilter, statusFilter, languageFilter, currencyFilter, countryFilter, datePreset, sortIdx, page],
    queryFn: () => api.get('/admin/users', {
      params: {
        page, limit: 20,
        ...(search && { search }),
        ...(planFilter && { plan: planFilter }),
        ...(statusFilter !== '' && { isActive: statusFilter }),
        ...(languageFilter && { language: languageFilter }),
        ...(currencyFilter && { currency: currencyFilter }),
        ...(countryFilter && { country: countryFilter }),
        ...(createdAfter && { createdAfter }),
        orderBy: sort.orderBy,
        order: sort.order,
      },
    }).then(r => r.data),
  });

  const activate = useMutation({
    mutationFn: ({ userId, planCode, months }) =>
      api.post(`/admin/users/${userId}/activate-subscription`, { planCode, months }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-users'] }); setActivateUser(null); setSelectedUser(null); },
    onError: (e) => alert(e?.response?.data?.message || 'Erreur activation'),
  });

  const users      = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="space-y-5 max-w-7xl">
      {/* En-tête */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-1">Utilisateurs</h1>
          <p className="text-sm text-ink-4 mt-0.5">{pagination?.total !== undefined ? `${pagination.total} utilisateurs` : ''}</p>
        </div>
        <a href={`${import.meta.env.VITE_API_URL || ''}/api/admin/export/users`} download
          className="flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-overlay/[0.05] border border-overlay/[0.11] text-ink-3 hover:text-ink-1 hover:bg-overlay/[0.08] transition-colors shrink-0">
          <Download size={13} /> Exporter CSV
        </a>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard label="Total utilisateurs"    value={statsData?.total}               icon={Users}       color="text-primary-400" />
        <StatCard label="Nouveaux ce mois"      value={statsData?.newThisMonth}         icon={Calendar}    color="text-emerald-400" />
        <StatCard label="Cette semaine"         value={statsData?.newThisWeek}          icon={TrendingUp}  color="text-cyan-400" />
        <StatCard label="Abonnés actifs"        value={statsData?.activeSubscriptions}  icon={Crown}       color="text-amber-400" />
        <StatCard label="Suspendus"             value={statsData?.suspended}            icon={AlertTriangle} color="text-red-400" />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-52">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
          <input type="search" className="input pl-9 h-10 text-sm" placeholder="Rechercher…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>

        {/* Plan */}
        <select value={planFilter} onChange={e => { setPlanFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[130px] h-10 text-sm px-3 appearance-none">
          <option value="">Tous les plans</option>
          <option value="FREE">Gratuit</option>
          <option value="PREMIUM">Premium</option>
          <option value="LIFETIME">Lifetime</option>
        </select>

        {/* Statut */}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[110px] h-10 text-sm px-3 appearance-none">
          <option value="">Tous statuts</option>
          <option value="true">Actifs</option>
          <option value="false">Suspendus</option>
        </select>

        {/* Langue */}
        <select value={languageFilter} onChange={e => { setLanguageFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[120px] h-10 text-sm px-3 appearance-none">
          <option value="">Toutes langues</option>
          <option value="fr">Français</option>
          <option value="en">English</option>
          <option value="es">Español</option>
          <option value="pt">Português</option>
        </select>

        {/* Devise */}
        <select value={currencyFilter} onChange={e => { setCurrencyFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[130px] h-10 text-sm px-3 appearance-none">
          <option value="">Toutes devises</option>
          <option value="NONE">Non défini (auto)</option>
          <option value="FCFA">FCFA</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
          <option value="GBP">GBP</option>
          <option value="BRL">BRL</option>
          <option value="MXN">MXN</option>
          <option value="CAD">CAD</option>
          <option value="ZAR">ZAR</option>
        </select>

        {/* Pays */}
        <select value={countryFilter} onChange={e => { setCountryFilter(e.target.value); setPage(1); }}
          className="input w-auto min-w-[140px] h-10 text-sm px-3 appearance-none">
          <option value="">Tous les pays</option>
          <option value="NONE">Non défini</option>
          {COUNTRIES.map(({ code, flag, label }) => (
            <option key={code} value={code}>{flag} {label}</option>
          ))}
        </select>

        {/* Date preset chips */}
        <div className="flex gap-1 flex-wrap">
          {DATE_PRESETS.map((p, i) => (
            <button key={i} onClick={() => { setDatePreset(i); setPage(1); }}
              className={`px-3 h-10 rounded-xl border text-xs font-medium transition-colors ${
                datePreset === i ? 'border-primary-500/40 bg-primary-500/15 text-primary-400' : 'border-overlay/[0.08] text-ink-3 hover:text-ink-2'
              }`}
            >{p.label}</button>
          ))}
        </div>

        {/* Tri */}
        <select value={sortIdx} onChange={e => setSortIdx(Number(e.target.value))}
          className="input w-auto min-w-[150px] h-10 text-sm px-3 appearance-none">
          {ORDER_OPTIONS.map((o, i) => <option key={i} value={i}>{o.label}</option>)}
        </select>
      </div>

      {/* Tableau */}
      <div className="rounded-2xl border border-overlay/[0.11] overflow-hidden shine-subtle"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgb(var(--overlay-rgb) / 0.07)' }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-overlay/[0.07] divide-x divide-overlay/[0.07] text-[11px] text-ink-3 uppercase tracking-wider">
                <th className="text-left px-5 py-3.5 font-semibold">Utilisateur</th>
                <th className="text-left px-4 py-3.5 font-semibold">Plan</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Pronos</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden lg:table-cell">Inscrit le</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden xl:table-cell">Dernier login</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden xl:table-cell">Langue</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden xl:table-cell">Devise</th>
                <th className="text-left px-4 py-3.5 font-semibold hidden xl:table-cell">Pays</th>
                <th className="text-center px-4 py-3.5 font-semibold hidden lg:table-cell">App</th>
                <th className="text-left px-4 py-3.5 font-semibold">Statut</th>
                <th className="text-right px-5 py-3.5 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-overlay/[0.09]">
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="divide-x divide-overlay/[0.05]">{Array.from({ length: 11 }).map((_, j) => (
                    <td key={j} className="px-5 py-4"><div className="h-4 skeleton rounded" /></td>
                  ))}</tr>
                ))
                : users.map(u => {
                  const plan = u.subscription?.plan?.code || 'FREE';
                  return (
                    <tr key={u.id} className="hover:bg-overlay/[0.025] transition-colors cursor-pointer divide-x divide-overlay/[0.05]"
                      onClick={() => setSelectedUser(u)}>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={u} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ink-2 truncate">{u.profile?.displayName || u.username}</p>
                            <p className="text-xs text-ink-3 truncate">{u.email}</p>
                          </div>
                          {u.adminNote && <StickyNote size={12} className="text-amber-400 shrink-0" title="Note admin" />}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-lg ${PLAN_STYLE[plan] || PLAN_STYLE.FREE}`}>{plan}</span>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell">
                        <span className="text-sm text-ink-3">{u._count?.tips || 0}</span>
                        {u.tipsterStats?.successRate != null && (
                          <span className="text-xs text-ink-4 ml-1.5">({u.tipsterStats.successRate.toFixed(0)}%)</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-sm text-ink-3">
                        {format(new Date(u.createdAt), 'dd MMM yyyy', { locale: fr })}
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell text-xs text-ink-4">
                        {u.lastLoginAt ? formatDistanceToNow(new Date(u.lastLoginAt), { locale: fr, addSuffix: true }) : '—'}
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <LangBadge user={u} />
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <CurrencyBadge user={u} />
                      </td>
                      <td className="px-4 py-3.5 hidden xl:table-cell">
                        <CountryBadge user={u} />
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell text-center">
                        {u.appInstalledAt ? (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-primary-500/15 text-primary-400 border border-primary-500/20"
                            title={`App installée le ${format(new Date(u.appInstalledAt), 'dd MMM yyyy', { locale: fr })}`}
                          >
                            <Smartphone size={12} />
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center justify-center w-6 h-6 rounded-lg bg-overlay/[0.03] text-ink-4 border border-overlay/[0.06]"
                            title="Application non installée"
                          >
                            <Smartphone size={12} />
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${
                          u.isActive ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/15 text-red-400 border border-red-500/20'
                        }`}>
                          {u.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                          {u.isActive ? 'Actif' : 'Suspendu'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setActivateUser(u)}
                          className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg border border-amber-500/30 text-amber-400 hover:bg-amber-500/10 transition-colors ml-auto">
                          <Crown size={11} /> Premium
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
          <div className="flex items-center justify-between px-5 py-3.5 border-t border-overlay/[0.07]">
            <p className="text-xs text-ink-3">Page {page} sur {pagination.pages} — {pagination.total} utilisateurs</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                className="p-1.5 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] disabled:opacity-30 transition-colors">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}
                className="p-1.5 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.06] disabled:opacity-30 transition-colors">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal détail */}
      {selectedUser && !activateUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onActivate={(u) => setActivateUser(u)}
          qc={qc}
        />
      )}

      {/* Modal activation */}
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
