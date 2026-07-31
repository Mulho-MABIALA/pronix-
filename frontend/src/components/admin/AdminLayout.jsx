import { useState, useEffect } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, Trophy, AlertTriangle,
  Globe, Calendar, CreditCard, Menu, X,
  ExternalLink, LogOut, ChevronRight, ChevronLeft, Bot, Shield, BarChart3, Bell, BookOpen, Megaphone, Mail,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const SIDEBAR_COLLAPSE_KEY = 'admin-sidebar-collapsed';

const NAV_GROUPS = [
  {
    groupKey: 'overview',
    items: [
      { to: '/admin', itemKey: 'dashboard', Icon: LayoutDashboard, end: true },
    ],
  },
  {
    groupKey: 'community',
    items: [
      { to: '/admin/utilisateurs', itemKey: 'users',   Icon: Users },
      { to: '/admin/tipsters',     itemKey: 'tipsters', Icon: Trophy },
      { to: '/admin/signalements', itemKey: 'reports', Icon: AlertTriangle, badge: 'alert' },
    ],
  },
  {
    groupKey: 'data',
    items: [
      { to: '/admin/competitions', itemKey: 'competitions', Icon: Globe },
      { to: '/admin/matchs',       itemKey: 'matches',      Icon: Calendar },
      { to: '/admin/paiements',    itemKey: 'payments',     Icon: CreditCard },
      { to: '/admin/finances',     itemKey: 'finances',     Icon: BarChart3 },
      { to: '/admin/partenaires',  itemKey: 'partners',     Icon: Megaphone },
      { to: '/admin/newsletter',   itemKey: 'newsletter',   Icon: Mail },
    ],
  },
  {
    groupKey: 'content',
    items: [
      { to: '/admin/blog', itemKey: 'blogSeo', Icon: BookOpen },
    ],
  },
  {
    groupKey: 'intelligence',
    items: [
      { to: '/admin/agents',         itemKey: 'aiAgents',     Icon: Bot },
      { to: '/admin/notifications',  itemKey: 'notifications', Icon: Bell },
    ],
  },
];

function NavItem({ to, itemKey, Icon, end, badge, onClose, collapsed }) {
  const { t } = useTranslation();
  const label = t(`adminLayout.items.${itemKey}`);
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `relative flex items-center gap-3 rounded-xl text-[13px] font-medium transition-all duration-150 group ${
          collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'
        } ${
          isActive
            ? 'bg-primary-500/15 text-primary-300'
            : 'text-overlay/75 hover:text-ink-1 hover:bg-overlay/[0.06]'
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
          {!collapsed && <span className="flex-1 leading-none">{label}</span>}
          {badge === 'alert' && (
            <span className={`w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 ${collapsed ? 'absolute top-1.5 right-1.5' : ''}`} />
          )}
          {!collapsed && isActive && <ChevronRight size={12} className="text-primary-400/60 shrink-0" />}
        </>
      )}
    </NavLink>
  );
}

function SidebarContent({ onClose, collapsed }) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full select-none">

      {/* ── Logo ───────────────────────────────────────────────────────────── */}
      <div className={`flex items-center h-[60px] shrink-0 border-b border-overlay/[0.06] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        <Link to="/admin" onClick={onClose} className="flex items-center gap-2.5 group min-w-0">
          <img src="/logo-circle.png" alt="fpronix" className="w-8 h-8 rounded-full shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <p className="font-display font-bold text-[13px] text-ink-1 leading-tight tracking-tight truncate">
                fp<span className="text-primary-400">ronix</span>
              </p>
              <p className="text-[9px] text-overlay/55 uppercase tracking-[0.15em] font-semibold truncate">{t('adminLayout.adminConsole')}</p>
            </div>
          )}
        </Link>
        {onClose && (
          <button onClick={onClose}
            className="p-1.5 rounded-lg text-overlay/40 hover:text-ink-1 hover:bg-overlay/[0.08] transition-colors md:hidden">
            <X size={17} />
          </button>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────────────────────────── */}
      <nav className={`flex-1 overflow-y-auto py-4 space-y-5 ${collapsed ? 'px-2' : 'px-2.5'}`} aria-label="Admin navigation">
        {NAV_GROUPS.map(({ groupKey, items }) => (
          <div key={groupKey}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold text-overlay/45 uppercase tracking-[0.12em]">
                {t(`adminLayout.groups.${groupKey}`)}
              </p>
            )}
            {collapsed && <div className="mx-2 mb-1.5 border-t border-overlay/[0.06]" />}
            <div className="space-y-0.5">
              {items.map((item) => (
                <NavItem key={item.to} {...item} onClose={onClose} collapsed={collapsed} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className={`pb-3 pt-2 border-t border-overlay/[0.06] space-y-1 shrink-0 ${collapsed ? 'px-2' : 'px-2.5'}`}>
        <Link to="/" target="_blank"
          title={collapsed ? t('adminLayout.viewSite') : undefined}
          className={`flex items-center gap-3 rounded-xl text-[13px] text-overlay/65 hover:text-ink-1 hover:bg-overlay/[0.06] transition-colors ${collapsed ? 'justify-center px-2 py-2' : 'px-3 py-2'}`}>
          <ExternalLink size={14} />
          {!collapsed && t('adminLayout.viewSite')}
        </Link>

        {collapsed ? (
          <div className="flex flex-col items-center gap-2 pt-1.5">
            <div
              title={user?.username}
              className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-300 text-[11px] font-bold shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <button
              onClick={() => { logout(); navigate('/connexion'); }}
              className="p-1.5 rounded-lg text-overlay/30 hover:text-red-400 hover:bg-red-500/[0.1] transition-colors shrink-0"
              aria-label={t('adminLayout.logout')}
              title={t('adminLayout.logout')}>
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 px-3 py-2 mt-0.5 rounded-xl">
            <div className="w-7 h-7 rounded-full bg-primary-500/20 border border-primary-500/20 flex items-center justify-center text-primary-300 text-[11px] font-bold shrink-0">
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-overlay/90 truncate leading-tight">{user?.username}</p>
              <p className="text-[10px] text-overlay/55 truncate mt-0.5">{user?.email}</p>
            </div>
            <button
              onClick={() => { logout(); navigate('/connexion'); }}
              className="p-1.5 rounded-lg text-overlay/30 hover:text-red-400 hover:bg-red-500/[0.1] transition-colors shrink-0"
              aria-label={t('adminLayout.logout')}>
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { t } = useTranslation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSE_KEY) === '1';
  });

  useEffect(() => {
    window.localStorage.setItem(SIDEBAR_COLLAPSE_KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-bg)' }}>

      {/* ── Sidebar desktop ─────────────────────────────────────────────────── */}
      <aside className={`hidden md:flex flex-col shrink-0 fixed inset-y-0 left-0 z-30 border-r border-overlay/[0.06] transition-[width] duration-200 ${collapsed ? 'w-16' : 'w-56'}`}
        style={{ background: 'rgb(var(--surface-900-rgb) / 0.98)', backdropFilter: 'blur(20px)' }}>
        <SidebarContent collapsed={collapsed} />

        {/* Bouton réduire / agrandir */}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className="hidden md:flex absolute top-[26px] -right-3 w-6 h-6 rounded-full items-center justify-center border border-overlay/[0.1] text-overlay/50 hover:text-ink-1 hover:border-overlay/20 transition-colors z-40"
          style={{ background: 'var(--color-card)' }}
          aria-label={collapsed ? t('adminLayout.expandSidebar') : t('adminLayout.collapseSidebar')}
          title={collapsed ? t('adminLayout.expandSidebar') : t('adminLayout.collapseSidebar')}
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      {/* ── Sidebar mobile (overlay) ─────────────────────────────────────────── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="relative w-56 flex flex-col border-r border-overlay/[0.06] z-10"
            style={{ background: 'rgb(var(--surface-900-rgb) / 0.99)' }}>
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* ── Zone principale ──────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col min-h-screen min-w-0 transition-[margin] duration-200 ${collapsed ? 'md:ml-16' : 'md:ml-56'}`}>

        {/* Topbar mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 border-b border-overlay/[0.06] sticky top-0 z-20"
          style={{ background: 'rgb(var(--surface-900-rgb) / 0.95)', backdropFilter: 'blur(12px)' }}>
          <button onClick={() => setMobileOpen(true)}
            className="p-2 rounded-xl text-overlay/50 hover:text-ink-1 hover:bg-overlay/[0.08] transition-colors"
            aria-label={t('adminLayout.openMenu')}>
            <Menu size={19} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-primary-400" />
            <span className="font-display font-semibold text-ink-1 text-[13px]">{t('adminLayout.administration')}</span>
          </div>
        </div>

        {/* Contenu */}
        <main className="flex-1 p-5 md:p-7 lg:p-8">
          <Outlet />
        </main>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="px-5 md:px-7 lg:px-8 py-4 border-t border-overlay/[0.05] flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-primary-500/20 border border-primary-500/25 flex items-center justify-center">
              <Shield size={10} className="text-primary-400" />
            </div>
            <span className="text-[11px] text-ink-4 font-medium">
              fp<span className="text-primary-400">ronix</span> Admin Console
            </span>
            <span className="text-[11px] text-ink-3">·</span>
            <span className="text-[11px] text-ink-3">v1.0</span>
          </div>
          <p className="text-[11px] text-ink-3">
            {t('adminLayout.copyright', { year: new Date().getFullYear() })}
          </p>
        </footer>
      </div>
    </div>
  );
}
