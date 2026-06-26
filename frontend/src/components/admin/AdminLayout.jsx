import { useState } from 'react';
import { NavLink, Link, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, Trophy, AlertTriangle,
  Globe, Calendar, CreditCard, Menu, X,
  ExternalLink, LogOut, ChevronRight, Bot,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV = [
  { to: '/admin',               label: 'Dashboard',      Icon: LayoutDashboard, end: true },
  { to: '/admin/utilisateurs',  label: 'Utilisateurs',   Icon: Users },
  { to: '/admin/tipsters',      label: 'Tipsters',       Icon: Trophy },
  { to: '/admin/signalements',  label: 'Signalements',   Icon: AlertTriangle },
  { to: '/admin/competitions',  label: 'Compétitions',   Icon: Globe },
  { to: '/admin/matchs',        label: 'Matchs',         Icon: Calendar },
  { to: '/admin/paiements',     label: 'Paiements',      Icon: CreditCard },
  { to: '/admin/agents',        label: 'Agents IA',      Icon: Bot },
];

function SidebarContent({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-white/10 shrink-0">
        <Link to="/admin" className="flex items-center gap-2.5" onClick={onClose}>
          <span className="text-2xl">⚽</span>
          <div>
            <p className="font-display font-bold text-sm text-white leading-tight">Pronix</p>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Admin</p>
          </div>
        </Link>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors md:hidden">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5" aria-label="Admin navigation">
        {NAV.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-primary-500/20 text-primary-300 shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/10'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={17} strokeWidth={isActive ? 2.5 : 1.8} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-primary-400 opacity-60" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-white/10 space-y-1 shrink-0">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <ExternalLink size={16} />
          Voir le site
        </Link>

        <div className="flex items-center gap-2 px-3 py-2 mt-1">
          <div className="w-7 h-7 rounded-full bg-primary-500/30 flex items-center justify-center text-primary-300 text-xs font-bold shrink-0">
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white/80 truncate">{user?.username}</p>
            <p className="text-[10px] text-white/40 truncate">{user?.email}</p>
          </div>
          <button
            onClick={() => { logout(); navigate('/connexion'); }}
            className="p-1.5 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            aria-label="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Sidebar desktop (fixe) */}
      <aside className="hidden md:flex flex-col w-60 shrink-0 bg-surface-950 border-r border-white/8 fixed inset-y-0 left-0 z-30">
        <SidebarContent />
      </aside>

      {/* Sidebar mobile (overlay) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-64 bg-surface-950 border-r border-white/8 flex flex-col z-10">
            <SidebarContent onClose={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Zone principale */}
      <div className="flex-1 md:ml-60 flex flex-col min-h-screen">
        {/* Barre mobile */}
        <div className="md:hidden flex items-center gap-3 px-4 h-14 bg-surface-950 border-b border-white/8 sticky top-0 z-20">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Ouvrir le menu"
          >
            <Menu size={20} />
          </button>
          <span className="font-display font-semibold text-white text-sm">Administration</span>
        </div>

        {/* Contenu de la page */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
