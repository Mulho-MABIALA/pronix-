import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp, TrendingDown, DollarSign, Users, CreditCard,
  CheckCircle, XCircle, Clock, ArrowDownLeft, ArrowUpRight,
  PlusCircle, Trash2, Eye, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const STATUS_STYLE = {
  COMPLETED: { label: 'Complété',   cls: 'text-primary-400 bg-primary-500/15', Icon: CheckCircle },
  PENDING:   { label: 'En attente', cls: 'text-amber-400 bg-amber-500/15',      Icon: Clock },
  FAILED:    { label: 'Échoué',     cls: 'text-red-400 bg-red-500/15',          Icon: XCircle },
  REFUNDED:  { label: 'Remboursé',  cls: 'text-gray-400 bg-gray-500/15',        Icon: XCircle },
};

const PROVIDER_LABEL = {
  geniuspay: 'GeniusPay',
  wave:      'Wave',
  cinetpay:  'CinetPay',
  fedapay:   'FedaPay',
};

const CATEGORY_LABEL = {
  hosting:   { label: 'Hébergement', color: 'text-blue-400 bg-blue-500/15' },
  domain:    { label: 'Domaine',     color: 'text-purple-400 bg-purple-500/15' },
  api:       { label: 'API',         color: 'text-cyan-400 bg-cyan-500/15' },
  marketing: { label: 'Marketing',   color: 'text-orange-400 bg-orange-500/15' },
  salary:    { label: 'Salaire',     color: 'text-yellow-400 bg-yellow-500/15' },
  other:     { label: 'Autre',       color: 'text-gray-400 bg-gray-500/15' },
};

function StatCard({ label, value, sub, trend, icon: Icon, color = 'text-primary-400', bg = 'bg-primary-500/10' }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: 'var(--color-card)' }}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${bg}`}>
          <Icon size={18} className={color} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`flex items-center gap-1 text-xs font-semibold ${trend >= 0 ? 'text-primary-400' : 'text-red-400'}`}>
            {trend >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white mb-0.5">{value}</p>
      <p className="text-xs text-gray-300">{label}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatAmount(amount, currency = 'XOF') {
  if (!amount && amount !== 0) return '— XOF';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

const TABS = [
  { key: 'overview',     label: 'Vue d\'ensemble' },
  { key: 'transactions', label: 'Entrées' },
  { key: 'expenses',     label: 'Sorties' },
];

const CATEGORIES = ['hosting', 'domain', 'api', 'marketing', 'salary', 'other'];

export default function AdminFinances() {
  const [activeTab, setActiveTab]     = useState('overview');
  const [showForm, setShowForm]       = useState(false);
  const [formData, setFormData]       = useState({ amount: '', description: '', category: 'other', date: '' });
  const [viewExpense, setViewExpense] = useState(null); // dépense sélectionnée pour la modale
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-finances'],
    queryFn:  () => api.get('/admin/finances').then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  const addMutation = useMutation({
    mutationFn: (payload) => api.post('/admin/expenses', payload),
    onSuccess: () => {
      qc.invalidateQueries(['admin-finances']);
      setShowForm(false);
      setFormData({ amount: '', description: '', category: 'other', date: '' });
    },
  });

  const delMutation = useMutation({
    mutationFn: (id) => api.delete(`/admin/expenses/${id}`),
    onSuccess:  () => qc.invalidateQueries(['admin-finances']),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const { summary = {}, byMethod = [], byStatus = [], recentPayments = [], expenses = [] } = data || {};

  const totalByProvider = byMethod.reduce((acc, m) => {
    acc[m.provider] = { amount: m._sum?.amount || 0, count: m._count || 0 };
    return acc;
  }, {});

  const statusCount = byStatus.reduce((acc, s) => {
    acc[s.status] = s._count || 0;
    return acc;
  }, {});

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount || !formData.description) return;
    addMutation.mutate({
      amount:      parseInt(formData.amount, 10),
      description: formData.description,
      category:    formData.category,
      date:        formData.date || undefined,
    });
  };

  const netProfit = (summary.netProfit || 0);

  return (
    <>
    {/* ── Modale détail dépense ── */}
    {viewExpense && (() => {
      const cat = CATEGORY_LABEL[viewExpense.category] || CATEGORY_LABEL.other;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewExpense(null)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-white/[0.08] p-6 space-y-5 animate-fade-in"
            style={{ background: 'var(--color-card)' }}>

            {/* En-tête */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Détail dépense</p>
                <h3 className="text-base font-bold text-white leading-snug">{viewExpense.description}</h3>
              </div>
              <button onClick={() => setViewExpense(null)}
                className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0">
                <X size={16} />
              </button>
            </div>

            {/* Champs */}
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
                <span className="text-xs text-gray-300">Montant</span>
                <span className="text-sm font-bold text-red-400">{formatAmount(viewExpense.amount)}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
                <span className="text-xs text-gray-300">Catégorie</span>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${cat.color}`}>{cat.label}</span>
              </div>
              <div className="flex items-center justify-between py-2.5 border-b border-white/[0.05]">
                <span className="text-xs text-gray-300">Date</span>
                <span className="text-sm text-gray-300">
                  {format(new Date(viewExpense.date), 'dd MMMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <span className="text-xs text-gray-300">Ajouté le</span>
                <span className="text-xs text-gray-300">
                  {format(new Date(viewExpense.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => {
                  setViewExpense(null);
                  if (window.confirm('Supprimer cette dépense ?')) delMutation.mutate(viewExpense.id);
                }}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors text-sm font-medium"
              >
                <Trash2 size={14} /> Supprimer
              </button>
              <button
                onClick={() => setViewExpense(null)}
                className="flex-1 py-2 rounded-xl bg-white/[0.06] text-gray-400 hover:bg-white/[0.10] transition-colors text-sm font-medium"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Finances</h1>
          <p className="text-sm text-gray-300 mt-0.5">Revenus, dépenses et bilan</p>
        </div>
        <span className="text-xs text-gray-400 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
          Mis à jour toutes les minutes
        </span>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-300 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── VUE D'ENSEMBLE ── */}
      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Revenus totaux"
              value={formatAmount(summary.totalRevenue)}
              sub={`${summary.totalPayments || 0} paiements`}
              icon={ArrowDownLeft}
              color="text-primary-400"
              bg="bg-primary-500/10"
            />
            <StatCard
              label="Dépenses totales"
              value={formatAmount(summary.totalExpenses)}
              sub={`${summary.totalExpensesCount || 0} sorties`}
              icon={ArrowUpRight}
              color="text-red-400"
              bg="bg-red-500/10"
            />
            <StatCard
              label="Bénéfice net"
              value={formatAmount(netProfit)}
              icon={DollarSign}
              color={netProfit >= 0 ? 'text-green-400' : 'text-red-400'}
              bg={netProfit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}
            />
            <StatCard
              label="Abonnements actifs"
              value={summary.activeSubscriptions || 0}
              icon={Users}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard
              label="Revenus ce mois"
              value={formatAmount(summary.monthRevenue)}
              sub={`${summary.monthPayments || 0} paiements`}
              trend={summary.growth}
              icon={TrendingUp}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Dépenses ce mois"
              value={formatAmount(summary.monthExpenses)}
              sub={`${summary.monthExpensesCount || 0} sorties`}
              icon={TrendingDown}
              color="text-red-400"
              bg="bg-red-500/10"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: 'var(--color-card)' }}>
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Par méthode de paiement</h2>
              <div className="space-y-3">
                {Object.keys(PROVIDER_LABEL).map((provider) => {
                  const d = totalByProvider[provider];
                  if (!d) return null;
                  const pct = summary.totalRevenue > 0 ? Math.round((d.amount / summary.totalRevenue) * 100) : 0;
                  return (
                    <div key={provider}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <CreditCard size={14} className="text-gray-300" />
                          <span className="text-sm text-gray-300">{PROVIDER_LABEL[provider]}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">{formatAmount(d.amount)}</span>
                          <span className="text-xs text-gray-300 ml-2">{d.count} tx</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {byMethod.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">Aucun paiement enregistré</p>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.06] p-5" style={{ background: 'var(--color-card)' }}>
              <h2 className="text-sm font-semibold text-gray-300 mb-4">Par statut</h2>
              <div className="space-y-2.5">
                {Object.entries(STATUS_STYLE).map(([status, { label, cls, Icon }]) => (
                  <div key={status} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                    <div className="flex items-center gap-2">
                      <Icon size={15} className={cls.split(' ')[0]} />
                      <span className="text-sm text-gray-300">{label}</span>
                    </div>
                    <span className={`text-sm font-bold px-2.5 py-0.5 rounded-lg ${cls}`}>
                      {statusCount[status] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── ENTRÉES ── */}
      {activeTab === 'transactions' && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'var(--color-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Utilisateur', 'Montant', 'Méthode', 'Statut', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {recentPayments.map((p) => {
                  const st = STATUS_STYLE[p.status] || STATUS_STYLE.PENDING;
                  return (
                    <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-200">{p.user?.username || '—'}</p>
                        <p className="text-xs text-gray-400">{p.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-primary-400">{formatAmount(p.amount)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-400">{PROVIDER_LABEL[p.provider] || p.provider}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg ${st.cls}`}>
                          <st.Icon size={11} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-300">
                          {format(new Date(p.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">Aucune transaction</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SORTIES ── */}
      {activeTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowForm((v) => !v)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 transition-colors text-sm font-medium"
            >
              <PlusCircle size={15} />
              Ajouter une dépense
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="rounded-2xl border border-white/[0.08] p-5 space-y-4" style={{ background: 'var(--color-card)' }}>
              <h3 className="text-sm font-semibold text-gray-200">Nouvelle dépense</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">Montant (XOF) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData((d) => ({ ...d, amount: e.target.value }))}
                    placeholder="Ex: 15000"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">Catégorie</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData((d) => ({ ...d, category: e.target.value }))}
                    className="w-full border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50"
                    style={{ background: 'var(--color-card)' }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{CATEGORY_LABEL[c]?.label || c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">Description *</label>
                  <input
                    type="text"
                    required
                    value={formData.description}
                    onChange={(e) => setFormData((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Ex: Serveur OVH mensuel"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-primary-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-300 mb-1.5">Date (optionnel)</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData((d) => ({ ...d, date: e.target.value }))}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500/50"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={addMutation.isLoading}
                  className="px-5 py-2 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors disabled:opacity-50"
                >
                  {addMutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2 rounded-xl bg-white/[0.06] text-gray-400 text-sm font-medium hover:bg-white/[0.10] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </form>
          )}

          <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'var(--color-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    {['Description', 'Catégorie', 'Montant', 'Date', ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {expenses.map((exp) => {
                    const cat = CATEGORY_LABEL[exp.category] || CATEGORY_LABEL.other;
                    return (
                      <tr key={exp.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-200">{exp.description}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${cat.color}`}>
                            {cat.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-red-400">{formatAmount(exp.amount)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-gray-300">
                            {format(new Date(exp.date), 'dd MMM yyyy', { locale: fr })}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewExpense(exp)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-primary-400 hover:bg-primary-500/[0.1] transition-colors"
                              title="Voir le détail"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Supprimer cette dépense ?')) delMutation.mutate(exp.id);
                              }}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/[0.1] transition-colors"
                              title="Supprimer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {expenses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400">
                        Aucune dépense enregistrée — cliquez sur "Ajouter une dépense"
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
