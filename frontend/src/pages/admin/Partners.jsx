import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  PlusCircle, Copy, Check, ChevronDown, ChevronUp, Power,
  Wallet, Users, CircleCheck, Clock, Percent,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

function formatAmount(amount) {
  if (!amount && amount !== 0) return '— XOF';
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount)) + ' XOF';
}

// Carte de stat globale (en haut de page) — même style que /admin/finances.
function StatCard({ icon: Icon, label, value, color = 'text-primary-400', bg = 'bg-primary-500/10' }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-4" style={{ background: 'var(--color-card)' }}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${bg}`}>
        <Icon size={16} className={color} />
      </div>
      <p className="text-lg font-bold text-white leading-tight truncate">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}

// Mini-stat compacte, utilisée en ligne dans chaque carte partenaire.
function MiniStat({ icon: Icon, label, value, color = 'text-gray-300' }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02]">
      <Icon size={12} className={color} />
      <div className="leading-none">
        <p className={`text-xs font-bold ${color}`}>{value}</p>
        <p className="text-[9px] text-gray-600 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CommissionsPanel({ partnerId }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-partner-commissions', partnerId],
    queryFn: () => api.get(`/admin/partners/${partnerId}/commissions`).then((r) => r.data.data),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/partners/commissions/${id}/mark-paid`),
    onSuccess: () => {
      qc.invalidateQueries(['admin-partner-commissions', partnerId]);
      qc.invalidateQueries(['admin-partners']);
    },
  });

  if (isLoading) {
    return <p className="text-xs text-gray-600 px-4 py-4">Chargement…</p>;
  }

  const commissions = data || [];

  if (commissions.length === 0) {
    return <p className="text-xs text-gray-600 px-4 py-4">Aucune commission générée pour l'instant.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/[0.06]">
            {['Filleul', 'Paiement', 'Commission', 'Statut', 'Date', ''].map((h) => (
              <th key={h} className="px-4 py-2 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {commissions.map((c) => (
            <tr key={c.id} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-2.5">
                <p className="text-xs font-medium text-gray-200">{c.conversion?.user?.username || '—'}</p>
                <p className="text-[10px] text-gray-600">{c.conversion?.user?.email}</p>
              </td>
              <td className="px-4 py-2.5 text-xs text-gray-400">{formatAmount(c.amount)}</td>
              <td className="px-4 py-2.5 text-xs font-bold text-primary-400">{formatAmount(c.commissionAmount)}</td>
              <td className="px-4 py-2.5">
                {c.status === 'PAID' ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-primary-500/15 text-primary-400">
                    <CircleCheck size={10} /> Payée
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400">
                    <Clock size={10} /> En attente
                  </span>
                )}
              </td>
              <td className="px-4 py-2.5 text-[10px] text-gray-500">
                {format(new Date(c.createdAt), 'dd MMM yyyy', { locale: fr })}
              </td>
              <td className="px-4 py-2.5">
                {c.status !== 'PAID' && (
                  <button
                    onClick={() => markPaidMutation.mutate(c.id)}
                    disabled={markPaidMutation.isPending}
                    className="text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-white/[0.06] text-gray-300 hover:bg-white/[0.10] transition-colors disabled:opacity-50"
                  >
                    Marquer payée
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPartners() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', commissionRate: '30', contact: '' });

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['admin-partners'],
    queryFn: () => api.get('/admin/partners').then((r) => r.data.data),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/partners', payload),
    onSuccess: () => {
      qc.invalidateQueries(['admin-partners']);
      setShowForm(false);
      setFormData({ name: '', code: '', commissionRate: '30', contact: '' });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }) => api.patch(`/admin/partners/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries(['admin-partners']),
  });

  const markAllPaidMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/partners/${id}/mark-all-paid`),
    onSuccess: (_, id) => {
      qc.invalidateQueries(['admin-partners']);
      qc.invalidateQueries(['admin-partner-commissions', id]);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.commissionRate) return;
    createMutation.mutate({
      name: formData.name,
      code: formData.code ? formData.code.toUpperCase() : undefined,
      commissionRate: parseFloat(formData.commissionRate) / 100,
      contact: formData.contact || undefined,
    });
  };

  const copyLink = (code, id) => {
    const url = `${window.location.origin}/inscription?partner=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const totalDue = partners.reduce((s, p) => s + p.totalDue, 0);
  const totalPaid = partners.reduce((s, p) => s + p.totalPaid, 0);
  const totalConversions = partners.reduce((s, p) => s + p.conversionCount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Partenaires</h1>
          <p className="text-sm text-gray-500 mt-0.5">Influenceurs rémunérés à la commission sur les abonnements générés</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-colors text-sm font-medium"
        >
          <PlusCircle size={15} />
          Ajouter un partenaire
        </button>
      </div>

      {/* Stats globales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Partenaires" value={partners.length} color="text-blue-400" bg="bg-blue-500/10" />
        <StatCard icon={Users} label="Filleuls apportés" value={totalConversions} color="text-purple-400" bg="bg-purple-500/10" />
        <StatCard icon={Clock} label="Commissions dues" value={formatAmount(totalDue)} color="text-amber-400" bg="bg-amber-500/10" />
        <StatCard icon={CircleCheck} label="Déjà versées" value={formatAmount(totalPaid)} color="text-primary-400" bg="bg-primary-500/10" />
      </div>

      {/* Formulaire ajout */}
      {showForm && (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'var(--color-card)' }}>
          <h3 className="text-sm font-semibold text-gray-200">Nouveau partenaire</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Nom *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))}
                placeholder="Ex: @foot_pronostics_225"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Code (optionnel — auto-généré sinon)</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: FOOT225"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50 uppercase"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Taux de commission (%) *</label>
              <input
                type="number"
                min="1"
                max="100"
                required
                value={formData.commissionRate}
                onChange={(e) => setFormData((d) => ({ ...d, commissionRate: e.target.value }))}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Contact (WhatsApp / téléphone)</label>
              <input
                type="text"
                value={formData.contact}
                onChange={(e) => setFormData((d) => ({ ...d, contact: e.target.value }))}
                placeholder="Ex: +225 07 00 00 00 00"
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? 'Création…' : 'Créer'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl bg-white/[0.06] text-gray-400 text-sm font-medium hover:bg-white/[0.10] transition-colors"
            >
              Annuler
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-xs text-red-400">
              {createMutation.error?.response?.data?.message || "Erreur lors de la création"}
            </p>
          )}
        </form>
      )}

      {/* Liste des partenaires */}
      <div className="space-y-3">
        {partners.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] p-8 text-center" style={{ background: 'var(--color-card)' }}>
            <p className="text-sm text-gray-600">Aucun partenaire pour l'instant — cliquez sur "Ajouter un partenaire".</p>
          </div>
        )}

        {partners.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'var(--color-card)' }}>
            <div className="p-4 flex items-center gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-white truncate">{p.name}</p>
                  {!p.active && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-gray-500/15 text-gray-500">Désactivé</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 text-xs text-gray-500 font-mono bg-white/[0.04] px-2 py-0.5 rounded-lg">
                    {p.code}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-purple-400">
                    <Percent size={11} /> {Math.round(p.commissionRate * 100)}%
                  </span>
                  {p.contact && <span className="text-xs text-gray-600">{p.contact}</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <MiniStat icon={Users} label="Filleuls" value={p.conversionCount} color="text-gray-300" />
                <MiniStat icon={Clock} label="Dû" value={formatAmount(p.totalDue)} color="text-amber-400" />
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyLink(p.code, p.id)}
                  className="p-2 rounded-lg text-gray-500 hover:text-primary-400 hover:bg-primary-500/[0.1] transition-colors"
                  title="Copier le lien de parrainage"
                >
                  {copiedId === p.id ? <Check size={15} className="text-primary-400" /> : <Copy size={15} />}
                </button>
                <button
                  onClick={() => toggleActiveMutation.mutate({ id: p.id, active: !p.active })}
                  className={`p-2 rounded-lg transition-colors ${p.active ? 'text-gray-500 hover:text-red-400 hover:bg-red-500/[0.1]' : 'text-gray-500 hover:text-primary-400 hover:bg-primary-500/[0.1]'}`}
                  title={p.active ? 'Désactiver' : 'Réactiver'}
                >
                  <Power size={15} />
                </button>
                {p.totalDue > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(`Marquer ${formatAmount(p.totalDue)} comme payé à ${p.name} ?`)) {
                        markAllPaidMutation.mutate(p.id);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-colors text-xs font-medium"
                  >
                    <Wallet size={13} />
                    Tout payer
                  </button>
                )}
                <button
                  onClick={() => setExpandedId((v) => (v === p.id ? null : p.id))}
                  className="p-2 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.08] transition-colors"
                  title="Voir les commissions"
                >
                  {expandedId === p.id ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              </div>
            </div>

            {expandedId === p.id && (
              <div className="border-t border-white/[0.06]">
                <CommissionsPanel partnerId={p.id} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
