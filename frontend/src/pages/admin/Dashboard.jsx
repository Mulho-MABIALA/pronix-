import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  Calendar, Target, Award, ArrowUpRight, ArrowDownRight,
  RefreshCw, Brain, Zap, Check, X, Activity,
  ChevronRight, Wifi, Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

// ── Utilitaires ────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

function KpiCard({ icon: Icon, label, value, sub, trend, gradient, to }) {
  const positive = trend > 0;
  const content = (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] p-5 flex flex-col gap-5 transition-all duration-300 hover:border-white/[0.14] hover:-translate-y-0.5 hover:shadow-xl"
      style={{ background: 'var(--color-card)' }}>
      {/* Glow top-right */}
      <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 transition-opacity group-hover:opacity-35 pointer-events-none"
        style={{ background: gradient }} />

      <div className="flex items-start justify-between relative">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: gradient + '22' }}>
          <Icon size={18} style={{ color: gradient.includes('34d399') ? '#34d399' : gradient.includes('818cf8') ? '#818cf8' : gradient.includes('fb923c') ? '#fb923c' : '#f87171' }} />
        </div>
        {trend !== undefined && trend !== null && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-lg ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      <div className="relative">
        <p className="text-[28px] font-display font-bold text-white leading-none tracking-tight">{value ?? '–'}</p>
        <p className="text-[12px] text-gray-400 mt-1.5 font-medium">{label}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
  return to ? (
    <Link to={to} className="block">{content}</Link>
  ) : content;
}

// ── Area Revenue Chart ─────────────────────────────────────────────────────────

function RevenueChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="rounded-2xl border border-white/[0.07] p-5 flex items-center justify-center h-48"
      style={{ background: 'var(--color-card)' }}>
      <p className="text-sm text-gray-600">Aucune donnée</p>
    </div>
  );

  const max = Math.max(...data.map(d => d.amount), 1);
  const W = 320, H = 100;
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * W;
    const y = H - (d.amount / max) * H * 0.85 - 6;
    return { x, y, ...d };
  });

  const polyline = pts.map(p => `${p.x},${p.y}`).join(' ');
  const area = `M${pts[0].x},${H} ` + pts.map(p => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${H} Z`;

  const total = data.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5"
      style={{ background: 'var(--color-card)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-semibold text-gray-100">Revenus — 6 mois</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Total : <span className="text-primary-400 font-semibold">{new Intl.NumberFormat('fr-FR').format(total)} FCFA</span></p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary-500/10 border border-primary-500/20">
          <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse" />
          <span className="text-[11px] text-primary-400 font-semibold">En direct</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 90 }}>
        <defs>
          <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1aa656" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#1aa656" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#rev-grad)" />
        <polyline points={polyline} fill="none" stroke="#1aa656" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#1aa656" opacity={i === pts.length - 1 ? 1 : 0.4} />
        ))}
      </svg>

      <div className="flex justify-between mt-2">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-gray-600 capitalize font-medium">{d.month}</span>
        ))}
      </div>
    </div>
  );
}

// ── Donut Plan Distribution ────────────────────────────────────────────────────

function PlanDistribution({ data }) {
  if (!data) return null;
  const free = data.FREE || 0;
  const premium = data.PREMIUM || 0;
  const total = free + premium || 1;
  const premiumPct = Math.round((premium / total) * 100);

  // SVG donut
  const R = 30, stroke = 10;
  const circ = 2 * Math.PI * R;
  const premiumArc = (premium / total) * circ;

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5"
      style={{ background: 'var(--color-card)' }}>
      <p className="text-sm font-semibold text-gray-100 mb-4">Plans actifs</p>

      <div className="flex items-center gap-6">
        {/* Donut */}
        <div className="relative shrink-0">
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle cx="40" cy="40" r={R} fill="none" stroke="#1aa656" strokeWidth={stroke}
              strokeDasharray={`${premiumArc} ${circ}`}
              strokeDashoffset={circ * 0.25}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1s ease' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-sm font-bold text-white">{premiumPct}%</p>
              <p className="text-[9px] text-gray-500">premium</p>
            </div>
          </div>
        </div>

        {/* Légende */}
        <div className="space-y-3 flex-1">
          {[
            { label: 'Premium', count: premium, color: '#1aa656', bg: 'bg-primary-500/15 text-primary-400' },
            { label: 'Gratuit',  count: free,    color: '#6b7280', bg: 'bg-gray-500/15 text-gray-400' },
          ].map(({ label, count, color, bg }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ background: color }} />
                <span className="text-xs text-gray-400">{label}</span>
              </div>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${bg}`}>{count}</span>
            </div>
          ))}
          <div className="pt-1 border-t border-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-gray-600">Total</span>
              <span className="text-xs font-bold text-gray-200">{total}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mini Stats Row ─────────────────────────────────────────────────────────────

function MiniStat({ icon: Icon, value, label, color }) {
  return (
    <div className="rounded-xl border border-white/[0.07] p-4 flex items-center gap-3"
      style={{ background: 'var(--color-card)' }}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-lg font-display font-bold text-gray-100 leading-none">{value ?? '–'}</p>
        <p className="text-[11px] text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Top Tipsters ───────────────────────────────────────────────────────────────

function TopTipsters({ data }) {
  if (!data?.length) return null;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5"
      style={{ background: 'var(--color-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-100">Top Tipsters</p>
        <Link to="/admin/tipsters" className="flex items-center gap-0.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Tous <ChevronRight size={12} />
        </Link>
      </div>
      <div className="space-y-1">
        {data.map((t, i) => (
          <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
            <span className="text-sm w-5 text-center">{medals[i] || <span className="text-xs text-gray-600 font-bold">{i + 1}</span>}</span>
            <div className="w-7 h-7 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-400 text-xs font-bold shrink-0">
              {t.displayName?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-gray-200 truncate">{t.displayName}</p>
              <p className="text-[10px] text-gray-600">{t.totalTips} pronos</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-sm font-bold ${t.successRate >= 60 ? 'text-emerald-400' : t.successRate >= 45 ? 'text-amber-400' : 'text-red-400'}`}>
                {t.successRate.toFixed(1)}%
              </span>
              <div className="h-1 w-12 rounded-full bg-white/[0.06] mt-1 overflow-hidden">
                <div className="h-full rounded-full bg-primary-500/70 transition-all"
                  style={{ width: `${Math.min(t.successRate, 100)}%` }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Recent Users ──────────────────────────────────────────────────────────────

function RecentUsers({ data }) {
  if (!data?.length) return null;

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5"
      style={{ background: 'var(--color-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-semibold text-gray-100">Derniers inscrits</p>
        <Link to="/admin/utilisateurs" className="flex items-center gap-0.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Tous <ChevronRight size={12} />
        </Link>
      </div>
      <div className="space-y-1">
        {data.map((u) => {
          const plan = u.subscription?.plan?.code || 'FREE';
          const isPremium = plan === 'PREMIUM';
          return (
            <div key={u.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center text-gray-300 text-sm font-bold shrink-0 ring-1 ring-white/[0.08]">
                {u.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-gray-200 truncate">{u.profile?.displayName || u.username}</p>
                <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
              </div>
              <div className="text-right shrink-0 space-y-0.5">
                <div>
                  <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md ${isPremium ? 'bg-primary-500/20 text-primary-400' : 'bg-white/[0.06] text-gray-500'}`}>
                    {plan}
                  </span>
                </div>
                <p className="text-[10px] text-gray-600">
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

// ── Sync Tools ────────────────────────────────────────────────────────────────

function SyncTools() {
  const today    = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const [states, setStates] = useState({});

  async function run(key, fn) {
    setStates(s => ({ ...s, [key]: 'loading' }));
    try {
      await fn();
      setStates(s => ({ ...s, [key]: 'ok' }));
    } catch {
      setStates(s => ({ ...s, [key]: 'error' }));
    }
    setTimeout(() => setStates(s => ({ ...s, [key]: null })), 3000);
  }

  function ActionBtn({ id, label, icon: Icon, fn, variant = 'default' }) {
    const st = states[id];
    const variants = {
      default: 'border-white/[0.08] text-gray-300 hover:border-white/20 hover:text-white hover:bg-white/[0.04]',
      blue:    'border-blue-500/20 text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/10',
      green:   'border-primary-500/20 text-primary-400 hover:border-primary-500/40 hover:bg-primary-500/10',
      amber:   'border-amber-500/20 text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/10',
    };
    return (
      <button onClick={() => run(id, fn)} disabled={st === 'loading'}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12px] font-semibold transition-all ${variants[variant]} disabled:opacity-40`}>
        {st === 'loading' ? <RefreshCw size={13} className="animate-spin" /> :
         st === 'ok'      ? <Check size={13} className="text-emerald-400" /> :
         st === 'error'   ? <X size={13} className="text-red-400" /> :
         <Icon size={13} />}
        {label}
      </button>
    );
  }

  const groups = [
    {
      label: 'Matchs',
      icon: Calendar,
      items: [
        { id: 'sync-today',    label: "Aujourd'hui", icon: RefreshCw, variant: 'blue', fn: () => api.post(`/admin/sync?date=${today}`) },
        { id: 'sync-tomorrow', label: 'Demain',       icon: RefreshCw, variant: 'blue', fn: () => api.post(`/admin/sync?date=${tomorrow}`) },
      ],
    },
    {
      label: 'Prédictions IA',
      icon: Brain,
      items: [
        { id: 'pred-today',    label: "Aujourd'hui", icon: Brain,      variant: 'green', fn: () => api.post(`/admin/sync-predictions?date=${today}`) },
        { id: 'pred-tomorrow', label: 'Demain',       icon: Brain,      variant: 'green', fn: () => api.post(`/admin/sync-predictions?date=${tomorrow}`) },
        { id: 'pred-force',    label: 'Forcer tout',  icon: Zap,        variant: 'amber', fn: () => api.post('/admin/sync-predictions?forceAll=true') },
      ],
    },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.07] p-5"
      style={{ background: 'var(--color-card)' }}>
      <div className="flex items-center gap-2 mb-5">
        <div className="w-7 h-7 rounded-lg bg-white/[0.06] flex items-center justify-center">
          <Activity size={14} className="text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-gray-100">Actions rapides</p>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {groups.map(({ label, icon: GroupIcon, items }) => (
          <div key={label}>
            <div className="flex items-center gap-2 mb-3">
              <GroupIcon size={12} className="text-gray-600" />
              <p className="text-[11px] font-bold text-gray-600 uppercase tracking-wider">{label}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {items.map(item => <ActionBtn key={item.id} {...item} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Skeleton({ className = '' }) {
  return <div className={`rounded-2xl bg-white/[0.04] animate-pulse ${className}`} />;
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const d    = data?.data;
  const kpis = d?.kpis;
  const now  = new Date();

  return (
    <div className="space-y-6 max-w-7xl">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gray-600 font-medium uppercase tracking-wider mb-1">
            {format(now, "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <h1 className="font-display font-bold text-2xl text-white">
            {greeting()}, <span className="text-primary-400">Admin</span> 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Voici l'état de fpronix en temps réel.</p>
        </div>
        {dataUpdatedAt > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/[0.07] shrink-0">
            <Clock size={12} className="text-gray-600" />
            <span className="text-[11px] text-gray-500">
              Mis à jour {format(new Date(dataUpdatedAt), 'HH:mm')}
            </span>
          </div>
        )}
      </div>

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Utilisateurs"
            value={kpis?.totalUsers?.toLocaleString('fr-FR')}
            sub={`+${kpis?.newUsersThisMonth || 0} ce mois`}
            trend={kpis?.userGrowth}
            gradient="radial-gradient(circle, #818cf8, #6366f1)"
            to="/admin/utilisateurs"
          />
          <KpiCard
            icon={TrendingUp}
            label="Abonnés Premium"
            value={kpis?.activeSubscriptions?.toLocaleString('fr-FR')}
            sub="Abonnements actifs"
            gradient="radial-gradient(circle, #34d399, #1aa656)"
            to="/admin/utilisateurs"
          />
          <KpiCard
            icon={DollarSign}
            label="MRR"
            value={`${new Intl.NumberFormat('fr-FR').format(kpis?.monthlyRevenue || 0)} FCFA`}
            sub={`Cumulé : ${new Intl.NumberFormat('fr-FR').format(kpis?.totalRevenue || 0)} FCFA`}
            trend={kpis?.revenueGrowth}
            gradient="radial-gradient(circle, #fb923c, #ea580c)"
            to="/admin/paiements"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Signalements"
            value={kpis?.pendingReports ?? 0}
            sub="En attente"
            gradient="radial-gradient(circle, #f87171, #dc2626)"
            to="/admin/signalements"
          />
        </div>
      )}

      {/* ── Mini stats ───────────────────────────────────────────────────────── */}
      {!isLoading && kpis && (
        <div className="grid grid-cols-3 gap-3">
          <MiniStat icon={Calendar} value={kpis.totalMatches?.toLocaleString('fr-FR')} label="Matchs en base"    color="bg-blue-500/15 text-blue-400" />
          <MiniStat icon={Target}   value={kpis.totalTips?.toLocaleString('fr-FR')}    label="Pronostics publiés" color="bg-violet-500/15 text-violet-400" />
          <MiniStat icon={Award}    value={kpis.churnThisMonth ?? 0}                   label="Churn ce mois"      color="bg-amber-500/15 text-amber-400" />
        </div>
      )}

      {/* ── Graphiques ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-44" />
          <Skeleton className="h-44" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <RevenueChart data={d?.revenueByMonth} />
          <PlanDistribution data={d?.planDistribution} />
        </div>
      )}

      {/* ── Tipsters + inscrits ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <TopTipsters data={d?.topTipsters} />
          <RecentUsers data={d?.recentUsers} />
        </div>
      )}

      {/* ── Actions rapides ──────────────────────────────────────────────────── */}
      <SyncTools />
    </div>
  );
}
