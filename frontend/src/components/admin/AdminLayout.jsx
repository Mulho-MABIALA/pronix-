import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Trophy, AlertTriangle,
  Globe, Calendar, CreditCard, Menu, X,
  ExternalLink, LogOut, ChevronRight, Bot, Shield, BarChart3,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV_GROUPS = [
  {
    label: 'Vue d\'ensemble',
    items: [
      { to: '/admin', label: 'Dashboard', Icon: LayoutDashboard, end: true },
    ],
  },
  {
    label: 'Communauté',
    items: [
      { to: '/admin/utilisateurs', label: 'Utilisateurs', Icon: Users },
      { to: '/admin/tipsters',     label: 'Tipsters',     Icon: Trophy },
      { to: '/admin/signalements', label: 'Signalements', Icon: AlertTriangle, badge: 'alert' },
    ],
  },
  {
    label: 'Données',
    items: [
      { to: '/admin/competitions', label: 'Compétitions', Icon: Globe },
      { to: '/admin/matchs',       label: 'Matchs',       Icon: Calendar },
      { to: '/admin/paiements',    label: 'Paiements',    Icon: CreditCard },
      { to: '/admin/finances',     label: 'Finances',     Icon: BarChart3 },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { to: '/admin/agents', label: 'Agents IA', Icon: Bot },
    ],
  },
];

function NavItem({ to, label, Icon, end, badge, onClose }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) =>
        `relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
          isActive
            ? 'bg-primary-500/15 text-primary-300'
            : 'text-white/50 hover:text-white/90 hover:bg-white/[0.06]'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {/* Active indicator */}
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-primary-400" />
          )}
          <Icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
          <span className="flex-1 leading-none">{label}</span>
          {badge === 'alert' && (
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
          )}
          {isActive && <ChevronRight size={12} className="text-primary-400/60 shrink-0" />}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 h-[60px] shrink-0 border-b border-white/[0.06]">
        <Link to="/admin" onClick={onClose} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
            <Shield size={14} className="text-primary-400" />
          </div>
          <div>
            <p className="font-display font-bold text-[13px] text-white leading-tight tracking-tight">
              fp<span className="text-primary-400">ronix</span>
            </p>
            <p className="text-[9px] text-white/30 uppercase tracking-[0.15em] font-semibold">Admin Console</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors md:hidden">
            <X size={17} />
          </button>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-5" aria-label="Admin navigation">
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 mb-1.5 text-[10px] font-bold text-white/20 uppercase tracking-[0.12em]">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.to} {...item} onClose={onClose} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-2.5 pb-3 pt-2 border-t border-white/[0.06] space-y-1 shrink-0">
        <Link to="/" target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors">
          <ExternalLink size={14} />
          Voir le site
        </Link>

        <div className="flex items-center gap-2.5 px-3 py-2 mt-0.5 rounded-xl">
          <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-300 text-[11px] font-bold shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-white/70 truncate leading-tight">{user?.username}</p>
            <p className="text-[10px] text-white/30 truncate mt-0.5">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/connexion'); }}
            className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/[0.1] transition-colors shrink-0"
            aria-label="Déconnexion">
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sidebar desktop ─────────────────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 fixed inset-y-0 left-0 z-30 border-r border-white/[0.06]"
        style={{ background: 'rgba(14,15,17,0.98)', backdropFilter: 'blur(20px)' }}>
        <SidebarContent />
      </aside>

      {/* ── Sidebar mobile (overlay) ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative w-56 flex flex-col border-r border-white/[0.06] z-10"
            style={{ background: 'rgba(14,15,17,0.99)' }}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Zone principale ──────────────────────────────────────────────────── */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">

        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-white/[0.06] sticky top-0 z-20"
          style={{ background: 'rgba(14,15,17,0.95)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-white/50 hover:text-white hover:bg-white/[0.08] transition-colors"
            aria-label="Ouvrir le menu">
            <Menu size={19} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-primary-400" />
            <span className="font-display font-semibold text-white text-[13px]">Administration</span>
          </div>
        </div>

        {/* Contenu */}
        <main className="flex-1 p-5 md:p-7 lg:p-8">
          <Outlet />
        </main>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="px-5 md:px-7 lg:px-8 py-4 border-t border-white/[0.05] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary-500/20 border border-primary-500/25 flex items-center justify-center">
              <Shield size={10} className="text-primary-400" />
            </div>
            <span className="text-[11px] text-gray-600 font-medium">
              fp<span className="text-primary-500">ronix</span> Admin Console
            </span>
            <span className="text-[11px] text-gray-700">·</span>
            <span className="text-[11px] text-gray-700">v1.0</span>
          </div>
          <p className="text-[11px] text-gray-700">
            © {new Date().getFullYear()} fpronix — Tous droits réservés
          </p>
        </footer>
      </div>
    </div>
  );
}
