import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  Calendar, Target, Award, ArrowUpRight, ArrowDownRight,
  RefreshCw, Brain, Zap, Check, X,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

// ── Composants utilitaires ─────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, trend, color, to }) {
  const positive = trend > 0;
  const card = (
    <div className={`bg-surface-800 border border-surface-700 rounded-2xl p-5 flex flex-col gap-4 hover:border-surface-600 transition-colors ${to ? 'cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between">
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={18} aria-hidden="true" />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold px-2 py-1 rounded-lg ${positive ? 'bg-primary-500/15 text-primary-400' : 'bg-red-500/15 text-red-400'}`}>
            {positive ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-display font-bold text-gray-50">{value ?? '–'}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
      </div>
    </div>
  );
  return to ? <Link to={to}>{card}</Link> : card;
}

function RevenueChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <h2 className="font-semibold text-gray-100 mb-4 text-sm">Revenus — 6 derniers mois</h2>
      <div className="flex items-end gap-2 h-28">
        {data.map((d, i) => {
          const pct = Math.max((d.amount / max) * 100, d.amount > 0 ? 8 : 2);
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] text-gray-600 font-medium">
                {d.amount > 0 ? `${(d.amount / 1000).toFixed(0)}k` : ''}
              </span>
              <div className="w-full rounded-t-lg bg-primary-500/20 relative overflow-hidden" style={{ height: '80px' }}>
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-lg bg-primary-500 transition-all duration-700"
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-500 font-medium capitalize">{d.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanDistribution({ data }) {
  if (!data) return null;
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const items = [
    { code: 'FREE',    label: 'Gratuit',  color: 'bg-gray-500'    },
    { code: 'PREMIUM', label: 'Premium',  color: 'bg-primary-500' },
  ];

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <h2 className="font-semibold text-gray-100 mb-4 text-sm">Distribution des plans</h2>
      <div className="space-y-3">
        {items.map(({ code, label, color }) => {
          const count = data[code] || 0;
          const pct = Math.round((count / total) * 100);
          return (
            <div key={code}>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">{label}</span>
                <span className="text-gray-300 font-semibold">{count} <span className="text-gray-600 font-normal">({pct}%)</span></span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-700 overflow-hidden">
                <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TopTipsters({ data }) {
  if (!data?.length) return null;
  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-100 text-sm">Top Tipsters</h2>
        <Link to="/admin/tipsters" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Voir tous →</Link>
      </div>
      <div className="space-y-2">
        {data.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3">
            <span className="w-5 text-xs text-gray-600 font-bold text-center">{i + 1}</span>
            <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
              {t.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-200 truncate">{t.displayName}</p>
              <p className="text-[10px] text-gray-600">{t.totalTips} pronos</p>
            </div>
            <span className={`text-xs font-bold ${t.successRate >= 60 ? 'text-primary-400' : t.successRate >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
              {t.successRate.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RecentUsers({ data }) {
  if (!data?.length) return null;
  const PLAN_STYLE = {
    FREE: 'bg-gray-500/15 text-gray-400',
    PREMIUM: 'bg-primary-500/15 text-primary-400',
  };

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-100 text-sm">Derniers inscrits</h2>
        <Link to="/admin/utilisateurs" className="text-xs text-primary-400 hover:text-primary-300 transition-colors">Voir tous →</Link>
      </div>
      <div className="space-y-2">
        {data.map((u) => {
          const plan = u.subscription?.plan?.code || 'FREE';
          return (
            <div key={u.id} className="flex items-center gap-3 py-1.5">
              <div className="w-8 h-8 rounded-full bg-surface-700 flex items-center justify-center text-gray-400 text-sm font-bold shrink-0">
                {u.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{u.profile?.displayName || u.username}</p>
                <p className="text-xs text-gray-500 truncate">{u.email}</p>
              </div>
              <div className="text-right shrink-0">
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-lg ${PLAN_STYLE[plan] || PLAN_STYLE.FREE}`}>
                  {plan}
                </span>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {format(new Date(u.createdAt), 'dd MMM', { locale: fr })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Outils de sync ────────────────────────────────────────────────────────────

function SyncTools() {
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

  const [states, setStates] = useState({});

  async function run(key, fn) {
    setStates((s) => ({ ...s, [key]: 'loading' }));
    try {
      const res = await fn();
      console.log('[Admin sync]', res.data);
      setStates((s) => ({ ...s, [key]: 'ok' }));
    } catch (e) {
      console.error('[Admin sync] erreur', e);
      setStates((s) => ({ ...s, [key]: 'error' }));
    }
    setTimeout(() => setStates((s) => ({ ...s, [key]: null })), 3000);
  }

  function BtnSync({ id, label, icon: Icon, fn, color = 'primary' }) {
    const st = states[id];
    const colors = {
      primary: 'bg-primary-500/15 text-primary-400 border-primary-500/25 hover:bg-primary-500/25',
      amber:   'bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/25',
      blue:    'bg-blue-500/15 text-blue-400 border-blue-500/25 hover:bg-blue-500/25',
    };
    return (
      <button onClick={() => run(id, fn)} disabled={st === 'loading'}
        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-colors ${colors[color]} disabled:opacity-50`}>
        {st === 'loading' ? <RefreshCw size={14} className="animate-spin" /> :
         st === 'ok'      ? <Check size={14} className="text-primary-400" /> :
         st === 'error'   ? <X size={14} className="text-red-400" /> :
         <Icon size={14} />}
        {label}
      </button>
    );
  }

  return (
    <div className="bg-surface-800 border border-surface-700 rounded-2xl p-5">
      <h2 className="font-semibold text-gray-100 text-sm mb-4">Outils de synchronisation</h2>

      <div className="space-y-4">
        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Matchs</p>
          <div className="flex flex-wrap gap-2">
            <BtnSync id="sync-today"    label="Sync aujourd'hui" icon={RefreshCw} color="blue"
              fn={() => api.post(`/admin/sync?date=${today}`)} />
            <BtnSync id="sync-tomorrow" label="Sync demain"      icon={RefreshCw} color="blue"
              fn={() => api.post(`/admin/sync?date=${tomorrow}`)} />
          </div>
        </div>

        <div>
          <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider font-semibold">Prédictions IA</p>
          <div className="flex flex-wrap gap-2">
            <BtnSync id="pred-today"    label="Prédictions aujourd'hui" icon={Brain} color="primary"
              fn={() => api.post(`/admin/sync-predictions?date=${today}`)} />
            <BtnSync id="pred-tomorrow" label="Prédictions demain"      icon={Brain} color="primary"
              fn={() => api.post(`/admin/sync-predictions?date=${tomorrow}`)} />
            <BtnSync id="pred-force"    label="Recalculer (forcer)" icon={Zap} color="amber"
              fn={() => api.post(`/admin/sync-predictions?forceAll=true`)} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Page principale ────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data),
    staleTime: 2 * 60 * 1000,
  });

  const d = data?.data;
  const kpis = d?.kpis;

  return (
    <div className="space-y-6 max-w-7xl">
      {/* En-tête */}
      <div>
        <h1 className="font-display font-bold text-2xl text-gray-50">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
        </p>
      </div>

      {/* KPIs principaux */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-surface-800 rounded-2xl h-28 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Utilisateurs"
            value={kpis?.totalUsers?.toLocaleString('fr-FR')}
            sub={`+${kpis?.newUsersThisMonth || 0} ce mois`}
            trend={kpis?.userGrowth}
            color="bg-blue-500/20 text-blue-400"
            to="/admin/utilisateurs"
          />
          <KpiCard
            icon={TrendingUp}
            label="Abonnés payants"
            value={kpis?.activeSubscriptions?.toLocaleString('fr-FR')}
            sub="Abonnements Premium actifs"
            color="bg-primary-500/20 text-primary-400"
            to="/admin/utilisateurs"
          />
          <KpiCard
            icon={DollarSign}
            label="MRR"
            value={`$${(kpis?.monthlyRevenue || 0).toFixed(2)}`}
            sub={`Total : $${(kpis?.totalRevenue || 0).toFixed(2)}`}
            trend={kpis?.revenueGrowth}
            color="bg-primary-500/20 text-primary-400"
            to="/admin/paiements"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Signalements"
            value={kpis?.pendingReports}
            sub="En attente de traitement"
            color="bg-red-500/20 text-red-400"
            to="/admin/signalements"
          />
        </div>
      )}

      {/* Stats secondaires */}
      {!isLoading && kpis && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-4 text-center">
            <Calendar size={18} className="mx-auto text-gray-500 mb-2" />
            <p className="font-display font-bold text-xl text-gray-100">{kpis.totalMatches?.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Matchs en base</p>
          </div>
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-4 text-center">
            <Target size={18} className="mx-auto text-gray-500 mb-2" />
            <p className="font-display font-bold text-xl text-gray-100">{kpis.totalTips?.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gray-500 mt-0.5">Pronostics publiés</p>
          </div>
          <div className="bg-surface-800 border border-surface-700 rounded-2xl p-4 text-center">
            <Award size={18} className="mx-auto text-gray-500 mb-2" />
            <p className="font-display font-bold text-xl text-gray-100">{kpis.churnThisMonth}</p>
            <p className="text-xs text-gray-500 mt-0.5">Churn ce mois</p>
          </div>
        </div>
      )}

      {/* Graphiques + distribution */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          <RevenueChart data={d?.revenueByMonth} />
          <PlanDistribution data={d?.planDistribution} />
        </div>
      )}

      {/* Tipsters + derniers inscrits */}
      {!isLoading && (
        <div className="grid md:grid-cols-2 gap-4">
          <TopTipsters data={d?.topTipsters} />
          <RecentUsers data={d?.recentUsers} />
        </div>
      )}

      {/* Outils admin */}
      <SyncTools />
    </div>
  );
}
