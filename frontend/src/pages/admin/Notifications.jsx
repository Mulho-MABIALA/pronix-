import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Users, Send, CheckCircle, AlertCircle, Zap, Smartphone } from 'lucide-react';
import api from '../../services/api';

const TEMPLATES = [
  {
    label: '⚽ Pronostics du jour',
    title: '⚽ Pronostics du jour disponibles !',
    body: 'Les meilleurs tipsters ont publié leurs picks pour aujourd\'hui. Découvrez-les maintenant.',
    url: '/pronostics',
  },
  {
    label: '🔥 Value Bets',
    title: '🔥 Value Bets détectés !',
    body: 'Des opportunités à forte valeur ont été identifiées sur les matchs du jour.',
    url: '/outils/filtres',
  },
  {
    label: '🎁 Offre Premium',
    title: '🎁 Passez à Premium',
    body: 'Accédez à des pronostics illimités et à l\'IA avancée. Offre limitée !',
    url: '/abonnement',
  },
  {
    label: '📊 Nouveaux matchs',
    title: '📊 Les matchs de la semaine sont disponibles',
    body: 'Calendrier mis à jour. Découvrez les affiches et préparez vos pronostics.',
    url: '/matchs',
  },
];

export default function AdminNotifications() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({ title: '', body: '', url: '/' });
  const [result, setResult] = useState(null);

  const { data: statsData } = useQuery({
    queryKey: ['admin-push-stats'],
    queryFn: () => api.get('/admin/push/stats').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const stats = statsData?.data;

  const { mutate: broadcast, isPending } = useMutation({
    mutationFn: (payload) => api.post('/admin/push/broadcast', payload).then((r) => r.data),
    onSuccess: (data) => {
      setResult({ ok: true, message: data.message });
      queryClient.invalidateQueries({ queryKey: ['admin-push-stats'] });
    },
    onError: (err) => {
      setResult({ ok: false, message: err.response?.data?.message || 'Erreur lors de l\'envoi' });
    },
  });

  const applyTemplate = (tpl) => {
    setForm({ title: tpl.title, body: tpl.body, url: tpl.url });
    setResult(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) return;
    setResult(null);
    broadcast(form);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl font-display font-bold text-white">Notifications Push</h1>
        <p className="text-sm text-ink-3 mt-1">Envoyez des notifications à tous les abonnés</p>
      </div>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-p flex flex-col gap-1">
          <div className="flex items-center gap-2 text-ink-3 text-xs font-semibold uppercase tracking-wide">
            <Users size={13} /> Total abonnés
          </div>
          <p className="text-3xl font-display font-bold text-white">{stats?.total ?? '—'}</p>
        </div>
        <div className="card-p flex flex-col gap-1">
          <div className="flex items-center gap-2 text-ink-3 text-xs font-semibold uppercase tracking-wide">
            <Smartphone size={13} /> Connectés
          </div>
          <p className="text-3xl font-display font-bold text-primary-400">{stats?.withUser ?? '—'}</p>
        </div>
        <div className="card-p flex flex-col gap-1">
          <div className="flex items-center gap-2 text-ink-3 text-xs font-semibold uppercase tracking-wide">
            <Bell size={13} /> Anonymes
          </div>
          <p className="text-3xl font-display font-bold text-ink-4">{stats?.anonymous ?? '—'}</p>
        </div>
      </div>

      {/* ── Déclencheurs automatiques ──────────────────────────────── */}
      <div className="card-p space-y-3">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Zap size={15} className="text-amber-400" />
          Déclencheurs automatiques
        </h2>
        <div className="space-y-2 text-sm text-ink-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary-500 shrink-0" />
            Nouveau pronostic publié par un tipster → broadcast automatique
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-live-500 shrink-0" />
            Match qui passe en direct → broadcast automatique
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            Fin de match → résultat par tipster (notification individuelle)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-500 shrink-0" />
            Paiement validé → confirmation d'abonnement (individuelle)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
            Abonnement expirant J-3 / J-1 → rappel (individuel)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
            7h30 chaque matin → digest des matchs du jour (broadcast)
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            Sync cotes (11h00) → value bets détectés (broadcast)
          </div>
        </div>
      </div>

      {/* ── Modèles rapides ───────────────────────────────────────── */}
      <div className="card-p space-y-3">
        <h2 className="text-sm font-semibold text-white">Modèles rapides</h2>
        <div className="grid grid-cols-2 gap-2">
          {TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              onClick={() => applyTemplate(tpl)}
              className="text-left p-3 rounded-xl border border-overlay/[0.06] hover:bg-overlay/[0.04] hover:border-overlay/[0.1] transition-colors text-sm text-ink-3 font-medium"
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Formulaire ────────────────────────────────────────────── */}
      <form onSubmit={handleSubmit} className="card-p space-y-4">
        <h2 className="text-sm font-semibold text-white">Diffusion manuelle</h2>

        <div>
          <label className="block text-xs font-semibold text-ink-3 mb-1.5">Titre *</label>
          <input
            className="input"
            placeholder="Titre de la notification"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            maxLength={80}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-3 mb-1.5">Message *</label>
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Contenu de la notification"
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            maxLength={200}
            required
          />
          <p className="text-[11px] text-ink-4 mt-1 text-right">{form.body.length}/200</p>
        </div>

        <div>
          <label className="block text-xs font-semibold text-ink-3 mb-1.5">URL de destination</label>
          <input
            className="input"
            placeholder="/pronostics"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
          />
        </div>

        {/* Aperçu */}
        {form.title && (
          <div className="p-3 rounded-xl bg-surface-800 border border-overlay/[0.06]">
            <p className="text-xs font-bold text-ink-4 uppercase tracking-widest mb-2">Aperçu</p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center shrink-0">
                <Bell size={18} className="text-primary-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{form.title}</p>
                <p className="text-xs text-ink-4 mt-0.5">{form.body}</p>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-medium ${
            result.ok ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            {result.ok ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {result.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || !stats?.total}
          className="btn-primary w-full"
        >
          {isPending ? (
            'Envoi en cours…'
          ) : (
            <>
              <Send size={15} />
              Envoyer à {stats?.total ?? 0} abonné{stats?.total !== 1 ? 's' : ''}
            </>
          )}
        </button>

        {!stats?.total && (
          <p className="text-xs text-ink-4 text-center">Aucun abonné pour l'instant</p>
        )}
      </form>
    </div>
  );
}
