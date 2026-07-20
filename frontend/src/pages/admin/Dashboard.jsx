import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, TrendingUp, DollarSign, AlertTriangle,
  Calendar, Target, Award, ArrowUpRight, ArrowDownRight,
  RefreshCw, Brain, Zap, Check, X, Activity,
  ChevronRight, Clock, Wifi, BarChart3, CreditCard,
  UserPlus, Percent, Trophy, ShieldAlert, Sparkles,
  MessageSquare, MessageCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bonjour';
  if (h < 18) return 'Bon après-midi';
  return 'Bonsoir';
}

function fmt(n) { return new Intl.NumberFormat('fr-FR').format(n ?? 0); }

// ── Pulse dot ──────────────────────────────────────────────────────────────────

function LiveDot({ color = '#34d399' }) {
  return (
    <span className="relative flex items-center justify-center w-2 h-2">
      <span className="absolute inline-flex h-full w-full rounded-full opacity-60 animate-ping" style={{ background: color }} />
      <span className="relative inline-flex rounded-full w-1.5 h-1.5" style={{ background: color }} />
    </span>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function Sk({ className = '' }) {
  return <div className={`rounded-2xl bg-white/[0.04] animate-pulse ${className}`} />;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

const KPI_THEMES = {
  indigo: {
    glow: 'rgba(99,102,241,0.18)',
    icon: 'bg-indigo-500/15 text-indigo-400',
    ring: 'rgba(99,102,241,0.25)',
  },
  emerald: {
    glow: 'rgba(52,211,153,0.15)',
    icon: 'bg-emerald-500/15 text-emerald-400',
    ring: 'rgba(52,211,153,0.25)',
  },
  orange: {
    glow: 'rgba(251,146,60,0.15)',
    icon: 'bg-orange-500/15 text-orange-400',
    ring: 'rgba(251,146,60,0.25)',
  },
  red: {
    glow: 'rgba(248,113,113,0.15)',
    icon: 'bg-red-500/15 text-red-400',
    ring: 'rgba(248,113,113,0.25)',
  },
};

function KpiCard({ icon: Icon, label, value, sub, trend, theme = 'indigo', to }) {
  const t = KPI_THEMES[theme];
  const positive = trend > 0;
  const hasTrend = trend !== undefined && trend !== null && trend !== 0;

  const inner = (
    <div
      className="group relative overflow-hidden rounded-2xl border p-5 flex flex-col gap-4 h-full transition-all duration-300 hover:-translate-y-0.5 hover:shadow-2xl cursor-pointer"
      style={{
        background: 'var(--color-card)',
        borderColor: 'rgba(255,255,255,0.11)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 2px 16px rgba(0,0,0,0.25)',
      }}
    >
      {/* corner glow */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)` }}
      />
      {/* subtle top glow always visible */}
      <div
        className="absolute top-0 right-0 w-20 h-20 rounded-full pointer-events-none opacity-30"
        style={{ background: `radial-gradient(circle, ${t.glow} 0%, transparent 70%)` }}
      />

      {/* icon + trend */}
      <div className="flex items-start justify-between relative z-10">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.icon}`}>
          <Icon size={18} />
        </div>
        {hasTrend && (
          <span className={`flex items-center gap-0.5 text-[11px] font-bold px-2 py-1 rounded-lg ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
            {positive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>

      {/* value */}
      <div className="relative z-10">
        <p className="text-[30px] font-display font-bold text-white leading-none tracking-tight tabular-nums">
          {value ?? '–'}
        </p>
        <p className="text-[12px] text-gray-400 font-medium mt-1.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );

  return to ? <Link to={to} className="block h-full">{inner}</Link> : inner;
}

// ── Stat pill ──────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, label, iconClass }) {
  return (
    <div
      className="flex items-center gap-3 rounded-xl border border-white/[0.11] px-4 py-3.5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
        <Icon size={15} />
      </div>
      <div>
        <p className="text-[17px] font-display font-bold text-white leading-none tabular-nums">{value ?? '–'}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Revenue chart ─────────────────────────────────────────────────────────────

function RevenueChart({ data }) {
  if (!data?.length) return (
    <div className="rounded-2xl border border-white/[0.11] p-5 flex items-center justify-center h-64"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <p className="text-sm text-gray-600">Aucune donnée</p>
    </div>
  );

  const max    = Math.max(...data.map(d => d.amount), 1);
  const W = 400, H = 120;
  const pad = 8;

  const pts = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (W - pad * 2),
    y: H - pad - (d.amount / max) * (H - pad * 2),
    ...d,
  }));

  // Smooth bezier path
  function bezierPath(pts) {
    if (pts.length < 2) return '';
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const cp1x = (pts[i - 1].x + pts[i].x) / 2;
      d += ` C ${cp1x} ${pts[i - 1].y}, ${cp1x} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`;
    }
    return d;
  }

  const linePath = bezierPath(pts);
  const areaPath = `${linePath} L ${pts[pts.length - 1].x} ${H} L ${pts[0].x} ${H} Z`;

  const total  = data.reduce((s, d) => s + d.amount, 0);
  const last2  = data.slice(-2);
  const momPct = last2.length === 2 && last2[0].amount > 0
    ? Math.round(((last2[1].amount - last2[0].amount) / last2[0].amount) * 100)
    : null;

  return (
    <div className="rounded-2xl border border-white/[0.11] p-5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-sm font-semibold text-white">Revenus mensuels</p>
          <p className="text-[11px] text-gray-500 mt-0.5">6 derniers mois</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-display font-bold text-white tabular-nums">{fmt(total)} FCFA</p>
          {momPct !== null && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ${momPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {momPct >= 0 ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
              {Math.abs(momPct)}% vs mois passé
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" style={{ height: 110 }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="rev-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.01" />
          </linearGradient>
          <filter id="glow-line">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map(frac => (
          <line key={frac} x1={pad} x2={W - pad} y1={H - pad - frac * (H - pad * 2)} y2={H - pad - frac * (H - pad * 2)}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}
        {/* area fill */}
        <path d={areaPath} fill="url(#rev-fill)" />
        {/* line */}
        <path d={linePath} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow-line)" />
        {/* dots */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="5" fill="var(--color-card)" stroke="#34d399" strokeWidth="2" opacity={i === pts.length - 1 ? 1 : 0.5} />
            {i === pts.length - 1 && <circle cx={p.x} cy={p.y} r="3" fill="#34d399" />}
          </g>
        ))}
      </svg>

      {/* month labels */}
      <div className="flex justify-between mt-2 px-1">
        {data.map((d, i) => (
          <span key={i} className="text-[10px] text-gray-600 capitalize font-medium text-center">{d.month}</span>
        ))}
      </div>
    </div>
  );
}

// ── Conversion funnel ──────────────────────────────────────────────────────────

function ConversionCard({ data, kpis }) {
  if (!data) return null;
  const free    = data.FREE    || 0;
  const premium = data.PREMIUM || 0;
  const total   = free + premium || 1;
  const convPct = ((premium / total) * 100).toFixed(1);

  // SVG donut
  const R = 32, stroke = 11;
  const circ       = 2 * Math.PI * R;
  const premiumArc = (premium / total) * circ;

  return (
    <div className="rounded-2xl border border-white/[0.11] p-5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm font-semibold text-white">Conversion</p>
          <p className="text-[11px] text-gray-500 mt-0.5">Plans actifs</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <Percent size={11} className="text-emerald-400" />
          <span className="text-[12px] font-bold text-emerald-400">{convPct}%</span>
        </div>
      </div>

      <div className="flex items-center gap-5">
        {/* donut */}
        <div className="relative shrink-0">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} />
            <circle cx="45" cy="45" r={R} fill="none" stroke="#34d399" strokeWidth={stroke}
              strokeDasharray={`${premiumArc} ${circ}`}
              strokeDashoffset={circ * 0.25}
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)' }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center flex-col">
            <p className="text-[15px] font-display font-bold text-white leading-none">{convPct}%</p>
            <p className="text-[9px] text-gray-500 mt-0.5">premium</p>
          </div>
        </div>

        {/* bars */}
        <div className="flex-1 space-y-3">
          {[
            { label: 'Premium', count: premium, color: '#34d399', bg: 'bg-emerald-500/15 text-emerald-400', bar: 'bg-emerald-500' },
            { label: 'Gratuit',  count: free,    color: '#6b7280', bg: 'bg-gray-500/15 text-gray-400',    bar: 'bg-gray-600' },
          ].map(({ label, count, bg, bar }) => (
            <div key={label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-gray-400 font-medium">{label}</span>
                <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-md ${bg}`}>{count}</span>
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.05] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-1000 ${bar}`}
                  style={{ width: `${(count / total) * 100}%` }} />
              </div>
            </div>
          ))}
          <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between">
            <span className="text-[11px] text-gray-600">Total inscrits</span>
            <span className="text-[12px] font-bold text-gray-200">{fmt(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Top Tipsters ───────────────────────────────────────────────────────────────

const MEDALS  = ['🥇', '🥈', '🥉'];
const AVATAR_COLORS = [
  'bg-indigo-500/25 text-indigo-400',
  'bg-violet-500/25 text-violet-400',
  'bg-sky-500/25 text-sky-400',
  'bg-emerald-500/25 text-emerald-400',
  'bg-amber-500/25 text-amber-400',
];

function TopTipsters({ data }) {
  if (!data?.length) return null;
  return (
    <div className="rounded-2xl border border-white/[0.11] p-5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-amber-400" />
          <p className="text-sm font-semibold text-white">Top Tipsters</p>
        </div>
        <Link to="/admin/tipsters"
          className="flex items-center gap-0.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Voir tous <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-1.5">
        {data.map((tip, i) => {
          const rate = tip.successRate ?? 0;
          const rateColor = rate >= 60 ? 'text-emerald-400' : rate >= 45 ? 'text-amber-400' : 'text-red-400';
          return (
            <div key={tip.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors group">
              <span className="w-5 text-center text-sm shrink-0">
                {i < 3 ? MEDALS[i] : <span className="text-xs font-bold text-gray-600">{i + 1}</span>}
              </span>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {tip.displayName?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-gray-200 truncate group-hover:text-white transition-colors">
                  {tip.displayName}
                </p>
                <p className="text-[10px] text-gray-600">{fmt(tip.totalTips)} picks</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-[13px] font-bold tabular-nums ${rateColor}`}>{rate.toFixed(1)}%</p>
                <div className="h-1 w-14 rounded-full bg-white/[0.05] mt-1 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${rate >= 60 ? 'bg-emerald-500' : rate >= 45 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(rate, 100)}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Recent Users ──────────────────────────────────────────────────────────────

function RecentUsers({ data }) {
  if (!data?.length) return null;
  return (
    <div className="rounded-2xl border border-white/[0.11] p-5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <UserPlus size={14} className="text-indigo-400" />
          <p className="text-sm font-semibold text-white">Derniers inscrits</p>
        </div>
        <Link to="/admin/utilisateurs"
          className="flex items-center gap-0.5 text-[11px] text-primary-400 hover:text-primary-300 transition-colors font-medium">
          Voir tous <ChevronRight size={12} />
        </Link>
      </div>

      <div className="space-y-1">
        {data.map((u, i) => {
          const plan      = u.subscription?.plan?.code || 'FREE';
          const isPremium = plan === 'PREMIUM';
          const letter    = (u.profile?.displayName || u.username)?.charAt(0).toUpperCase();
          return (
            <div key={u.id}
              className="flex items-center gap-3 px-2 py-2.5 rounded-xl hover:bg-white/[0.03] transition-colors">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ring-1 ring-white/[0.08] ${AVATAR_COLORS[i % AVATAR_COLORS.length]}`}>
                {letter}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium text-gray-200 truncate">
                    {u.profile?.displayName || u.username}
                  </p>
                  {isPremium && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 shrink-0">
                      PRO
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{u.email}</p>
              </div>
              <p className="text-[10px] text-gray-600 shrink-0 font-medium">
                {format(new Date(u.createdAt), 'dd MMM', { locale: fr })}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

function QuickActions() {
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

  const ACTIONS = [
    {
      id: 'sync-today',
      label: "Sync matchs — Auj.",
      icon: RefreshCw,
      theme: 'sky',
      fn: () => api.post(`/admin/sync?date=${today}`),
    },
    {
      id: 'sync-tomorrow',
      label: 'Sync matchs — Dem.',
      icon: Calendar,
      theme: 'sky',
      fn: () => api.post(`/admin/sync?date=${tomorrow}`),
    },
    {
      id: 'pred-today',
      label: "Prédictions — Auj.",
      icon: Brain,
      theme: 'emerald',
      fn: () => api.post(`/admin/sync-predictions?date=${today}`),
    },
    {
      id: 'pred-tomorrow',
      label: 'Prédictions — Dem.',
      icon: Brain,
      theme: 'emerald',
      fn: () => api.post(`/admin/sync-predictions?date=${tomorrow}`),
    },
    {
      id: 'pred-force',
      label: 'Forcer tout',
      icon: Zap,
      theme: 'amber',
      fn: () => api.post('/admin/sync-predictions?forceAll=true'),
    },
  ];

  const THEME_CLASSES = {
    sky:     'border-sky-500/20 text-sky-400 hover:border-sky-500/40 hover:bg-sky-500/10',
    emerald: 'border-emerald-500/20 text-emerald-400 hover:border-emerald-500/40 hover:bg-emerald-500/10',
    amber:   'border-amber-500/20 text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/10',
  };

  return (
    <div className="rounded-2xl border border-white/[0.11] p-5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
          <Sparkles size={13} className="text-gray-400" />
        </div>
        <p className="text-sm font-semibold text-white">Actions rapides</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {ACTIONS.map(({ id, label, icon: Icon, theme, fn }) => {
          const st = states[id];
          return (
            <button
              key={id}
              onClick={() => run(id, fn)}
              disabled={st === 'loading'}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12px] font-semibold transition-all duration-200 disabled:opacity-40 ${THEME_CLASSES[theme]}`}
            >
              {st === 'loading' ? <RefreshCw size={13} className="animate-spin" />
              : st === 'ok'     ? <Check  size={13} className="text-emerald-400" />
              : st === 'error'  ? <X      size={13} className="text-red-400" />
              :                   <Icon   size={13} />}
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Liens rapides ─────────────────────────────────────────────────────────────

const NAV_SHORTCUTS = [
  { to: '/admin/utilisateurs',  label: 'Utilisateurs',  icon: Users,        color: 'text-indigo-400  bg-indigo-500/10' },
  { to: '/admin/paiements',     label: 'Paiements',     icon: CreditCard,   color: 'text-orange-400  bg-orange-500/10' },
  { to: '/admin/tipsters',      label: 'Tipsters',      icon: Trophy,       color: 'text-amber-400   bg-amber-500/10' },
  { to: '/admin/signalements',  label: 'Signalements',  icon: ShieldAlert,  color: 'text-red-400     bg-red-500/10' },
  { to: '/admin/notifications', label: 'Notifs push',   icon: Wifi,         color: 'text-sky-400     bg-sky-500/10' },
  { to: '/admin/agents',        label: 'Agents IA',     icon: Brain,        color: 'text-violet-400  bg-violet-500/10' },
  { to: '/admin/matchs',        label: 'Matchs',        icon: Calendar,      color: 'text-blue-400    bg-blue-500/10' },
  { to: '/admin/finances',      label: 'Finances',      icon: BarChart3,     color: 'text-emerald-400 bg-emerald-500/10' },
  { to: '/admin/pronostics',    label: 'Pronos',        icon: Target,        color: 'text-violet-400  bg-violet-500/10' },
  { to: '/admin/commentaires',  label: 'Commentaires',  icon: MessageCircle, color: 'text-pink-400    bg-pink-500/10' },
  { to: '/admin/support',       label: 'Support',       icon: MessageSquare, color: 'text-cyan-400    bg-cyan-500/10' },
];

function NavShortcuts() {
  return (
    <div className="rounded-2xl border border-white/[0.11] p-5"
      style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07)' }}>
      <p className="text-sm font-semibold text-white mb-4">Navigation rapide</p>
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {NAV_SHORTCUTS.map(({ to, label, icon: Icon, color }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-white/[0.04] transition-colors group text-center"
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
              <Icon size={16} />
            </div>
            <span className="text-[10px] font-medium text-gray-400 group-hover:text-white transition-colors leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ── Dashboard principal ───────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { data, isLoading, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then(r => r.data),
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const d    = data?.data;
  const kpis = d?.kpis;
  const now  = new Date();

  return (
    <div className="space-y-5 max-w-7xl pb-6">

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl border border-white/[0.11] p-5 flex items-start justify-between gap-4"
        style={{ background: 'var(--color-card)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.09), 0 4px 24px rgba(0,0,0,0.3)' }}
      >
        <div className="flex items-center gap-4">
          <img src="/logo-circle.png" alt="fpronix" className="w-14 h-14 rounded-full shrink-0 drop-shadow-lg" />
          <div>
            <p className="text-[11px] text-gray-400 font-semibold uppercase tracking-widest mb-1 flex items-center gap-1.5">
              <LiveDot />
              {format(now, "EEEE d MMMM yyyy", { locale: fr })}
            </p>
            <h1 className="font-display font-bold text-[26px] text-white tracking-tight">
              {greeting()}&nbsp;<span className="text-primary-400">Admin</span> 👋
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Vue en temps réel de fpronix.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {dataUpdatedAt > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.11]">
              <Clock size={12} className="text-gray-400" />
              <span className="text-[11px] text-gray-300 font-medium">
                {format(new Date(dataUpdatedAt), 'HH:mm')}
              </span>
            </div>
          )}
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.11] text-[12px] text-gray-300 hover:text-white hover:bg-white/[0.09] transition-all disabled:opacity-50"
          >
            <RefreshCw size={12} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Navigation rapide ────────────────────────────────────────────────── */}
      <NavShortcuts />

      {/* ── KPIs ─────────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Sk key={i} className="h-36" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            icon={Users}
            label="Utilisateurs"
            value={fmt(kpis?.totalUsers)}
            sub={`+${kpis?.newUsersThisMonth || 0} ce mois`}
            trend={kpis?.userGrowth}
            theme="indigo"
            to="/admin/utilisateurs"
          />
          <KpiCard
            icon={TrendingUp}
            label="Abonnés Premium"
            value={fmt(kpis?.activeSubscriptions)}
            sub="Abonnements actifs"
            theme="emerald"
            to="/admin/utilisateurs"
          />
          <KpiCard
            icon={DollarSign}
            label="MRR"
            value={`${fmt(kpis?.monthlyRevenue)} FCFA`}
            sub={`Cumulé : ${fmt(kpis?.totalRevenue)} FCFA`}
            trend={kpis?.revenueGrowth}
            theme="orange"
            to="/admin/paiements"
          />
          <KpiCard
            icon={AlertTriangle}
            label="Signalements"
            value={kpis?.pendingReports ?? 0}
            sub="En attente de traitement"
            theme="red"
            to="/admin/signalements"
          />
        </div>
      )}

      {/* ── Mini stats ───────────────────────────────────────────────────────── */}
      {!isLoading && kpis && (
        <div className="grid grid-cols-3 gap-3">
          <StatPill icon={Calendar}  value={fmt(kpis.totalMatches)}  label="Matchs en base"     iconClass="bg-blue-500/15 text-blue-400" />
          <StatPill icon={Target}    value={fmt(kpis.totalTips)}     label="Pronostics publiés" iconClass="bg-violet-500/15 text-violet-400" />
          <StatPill icon={Activity}  value={kpis.churnThisMonth ?? 0} label="Churn ce mois"     iconClass="bg-rose-500/15 text-rose-400" />
        </div>
      )}

      {/* ── Graphiques ───────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid md:grid-cols-3 gap-4">
          <Sk className="h-56 md:col-span-2" />
          <Sk className="h-56" />
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <RevenueChart data={d?.revenueByMonth} />
          </div>
          <ConversionCard data={d?.planDistribution} kpis={kpis} />
        </div>
      )}

      {/* ── Tipsters + inscrits ──────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid md:grid-cols-2 gap-4">
          <Sk className="h-64" />
          <Sk className="h-64" />
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          <TopTipsters data={d?.topTipsters} />
          <RecentUsers data={d?.recentUsers} />
        </div>
      )}

      {/* ── Actions rapides ──────────────────────────────────────────────────── */}
      <QuickActions />
    </div>
  );
}
