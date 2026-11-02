import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Wrench, Power, AlertTriangle } from 'lucide-react';
import api from '../../services/api';

// ─── Bouton « Mode maintenance » du tableau de bord admin ────────────────────
// Ferme tout le site aux visiteurs (écran de maintenance), l'admin garde
// l'accès. Les paiements en cours restent traités (webhooks autorisés).
export default function MaintenanceCard() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then((r) => r.data.data),
    refetchInterval: 30 * 1000,
  });
  const enabled = !!data?.enabled;

  const [message, setMessage] = useState('');
  const [until, setUntil] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (body) => api.patch('/maintenance', body).then((r) => r.data.data),
    onSuccess: (value) => {
      queryClient.setQueryData(['maintenance'], value);
      setConfirming(false);
      setError('');
    },
    onError: (err) => setError(err.response?.data?.message || 'Action impossible'),
  });

  const activate = () => mutation.mutate({
    enabled: true,
    message: message.trim() || null,
    until: until ? new Date(until).toISOString() : null,
  });
  const deactivate = () => mutation.mutate({ enabled: false });

  return (
    <div
      className={`rounded-2xl border p-5 space-y-4 ${enabled ? 'border-red-500/50 bg-red-500/[0.06]' : 'border-overlay/[0.11]'}`}
      style={enabled ? undefined : { background: 'var(--color-card)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? 'bg-red-500/20' : 'bg-amber-500/15'}`}>
            <Wrench size={18} className={enabled ? 'text-red-400' : 'text-amber-400'} />
          </div>
          <div>
            <p className="font-semibold text-ink-1 text-sm">Mode maintenance</p>
            <p className="text-xs text-ink-3">
              {enabled
                ? `ACTIF depuis ${data?.startedAt ? format(new Date(data.startedAt), 'dd/MM HH:mm') : '—'} — le site est fermé aux visiteurs`
                : 'Inactif — le site est ouvert à tous'}
            </p>
          </div>
        </div>
        {enabled ? (
          <button
            onClick={deactivate}
            disabled={mutation.isPending}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary-500 hover:bg-primary-400 text-white text-sm font-semibold disabled:opacity-50"
          >
            <Power size={14} /> Rouvrir le site
          </button>
        ) : !confirming && (
          <button
            onClick={() => setConfirming(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold"
          >
            <Power size={14} /> Activer la maintenance
          </button>
        )}
      </div>

      {enabled && data?.message && (
        <p className="text-xs text-ink-3">Message affiché : « {data.message} »</p>
      )}

      {!enabled && confirming && (
        <div className="space-y-3 border-t border-overlay/[0.08] pt-4">
          <div>
            <label className="block text-xs text-ink-3 mb-1">Message pour les visiteurs (facultatif)</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Ex. : Mise à jour en cours, nous revenons dans 30 minutes."
              className="input resize-none text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-ink-3 mb-1">Retour prévu (facultatif)</label>
            <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} className="input text-sm" />
          </div>
          <div className="flex items-start gap-2 text-xs text-amber-300">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            Tous les visiteurs et abonnés verront l'écran de maintenance. Vous restez connecté et gardez l'accès.
            Les paiements déjà lancés continuent d'être validés.
          </div>
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="btn-secondary flex-1 text-sm py-2">Annuler</button>
            <button
              onClick={activate}
              disabled={mutation.isPending}
              className="flex-1 text-sm py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold disabled:opacity-50"
            >
              {mutation.isPending ? '…' : 'Confirmer : fermer le site'}
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
