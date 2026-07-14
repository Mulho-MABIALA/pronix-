import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, Users, CreditCard, CheckCircle, XCircle, Clock, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

const STATUS_STYLE = {
  COMPLETED: { label: 'Complété',  cls: 'text-primary-400 bg-primary-500/15', Icon: CheckCircle },
  PENDING:   { label: 'En attente', cls: 'text-amber-400 bg-amber-500/15',   Icon: Clock },
  FAILED:    { label: 'Échoué',    cls: 'text-red-400 bg-red-500/15',         Icon: XCircle },
  REFUNDED:  { label: 'Remboursé', cls: 'text-gray-400 bg-gray-500/15',       Icon: XCircle },
};

const PROVIDER_LABEL = {
  geniuspay: 'GeniusPay',
  wave:      'Wave',
  cinetpay:  'CinetPay',
  fedapay:   'FedaPay',
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
      <p className="text-xs text-gray-500">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function formatAmount(amount, currency = 'XOF') {
  if (!amount) return '0 XOF';
  return new Intl.NumberFormat('fr-FR').format(amount) + ' ' + currency;
}

export default function AdminFinances() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-finances'],
    queryFn: () => api.get('/admin/finances').then((r) => r.data.data),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const { summary = {}, byMethod = [], byStatus = [], recentPayments = [] } = data || {};

  const totalByProvider = byMethod.reduce((acc, m) => {
    acc[m.provider] = { amount: m._sum?.amount || 0, count: m._count || 0 };
    return acc;
  }, {});

  const statusCount = byStatus.reduce((acc, s) => {
    acc[s.status] = s._count || 0;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Finances</h1>
          <p className="text-sm text-gray-500 mt-0.5">Revenus, abonnements et transactions</p>
        </div>
        <span className="text-xs text-gray-600 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-1.5">
          Mis à jour toutes les minutes
        </span>
      </div>

      {/* Onglets */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {[
          { key: 'overview', label: 'Vue d\'ensemble' },
          { key: 'transactions', label: 'Transactions récentes' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === key
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-gray-500 hover:text-gray-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Revenu total"
              value={formatAmount(summary.totalRevenue)}
              sub={`${summary.totalPayments || 0} paiements`}
              icon={DollarSign}
              color="text-primary-400"
              bg="bg-primary-500/10"
            />
            <StatCard
              label="Ce mois"
              value={formatAmount(summary.monthRevenue)}
              sub={`${summary.monthPayments || 0} paiements`}
              trend={summary.growth}
              icon={TrendingUp}
              color="text-green-400"
              bg="bg-green-500/10"
            />
            <StatCard
              label="Mois dernier"
              value={formatAmount(summary.lastMonthRevenue)}
              icon={TrendingDown}
              color="text-blue-400"
              bg="bg-blue-500/10"
            />
            <StatCard
              label="Abonnements actifs"
              value={summary.activeSubscriptions || 0}
              icon={Users}
              color="text-amber-400"
              bg="bg-amber-500/10"
            />
          </div>

          {/* Répartition par méthode */}
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
                          <CreditCard size={14} className="text-gray-500" />
                          <span className="text-sm text-gray-300">{PROVIDER_LABEL[provider]}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-semibold text-white">{formatAmount(d.amount)}</span>
                          <span className="text-xs text-gray-500 ml-2">{d.count} tx</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
                {byMethod.length === 0 && (
                  <p className="text-sm text-gray-600 text-center py-4">Aucun paiement enregistré</p>
                )}
              </div>
            </div>

            {/* Répartition par statut */}
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

      {activeTab === 'transactions' && (
        <div className="rounded-2xl border border-white/[0.06] overflow-hidden" style={{ background: 'var(--color-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['Utilisateur', 'Montant', 'Méthode', 'Statut', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
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
                        <p className="text-xs text-gray-600">{p.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-white">{formatAmount(p.amount)}</span>
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
                        <span className="text-xs text-gray-500">
                          {format(new Date(p.createdAt), 'dd MMM yyyy HH:mm', { locale: fr })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentPayments.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-600">
                      Aucune transaction
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
