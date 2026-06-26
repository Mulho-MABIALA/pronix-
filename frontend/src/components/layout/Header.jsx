import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Sun, Moon, User, LogOut, Shield, ChevronDown, Filter, Zap, TrendingUp, BarChart2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import NotificationBell from '../ui/NotificationBell';

const NAV_LINKS = [
  { to: '/matchs',      label: 'Matchs' },
  { to: '/pronostics',  label: 'Pronostics' },
  { to: '/classements', label: 'Classements' },
  { to: '/tipsters',    label: 'Tipsters' },
];

const OUTILS_ITEMS = [
  { to: '/outils/filtres',       label: 'Filtres avancés', Icon: Filter,    desc: 'Filtrez par marché et confiance' },
  { to: '/outils/machine',       label: 'Générateur',      Icon: Zap,       desc: 'Créez votre ticket optimisé' },
  { to: '/pronostics',           label: 'Pronostics',      Icon: TrendingUp, desc: 'Picks du jour par confiance' },
  { to: '/outils/stats-ligues',  label: 'Stats ligues',    Icon: BarChart2,  desc: 'Buts, BTTS, O2.5 par compétition' },
];

function FootballLogo({ className }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <circle cx="14" cy="14" r="13" fill="white" />
      {/* Centre */}
      <polygon points="14,6 18,9.5 16.5,14.5 11.5,14.5 10,9.5" fill="#111827" />
      {/* Haut */}
      <polygon points="14,6 18,9.5 21,7 19,2.5 14,1.5 9,2.5 7,7 10,9.5" fill="#111827" />
      {/* Droite */}
      <polygon points="18,9.5 21,7 25,10.5 23.5,15.5 20,16 16.5,14.5" fill="#111827" />
      {/* Gauche */}
      <polygon points="10,9.5 7,7 3,10.5 4.5,15.5 8,16 11.5,14.5" fill="#111827" />
      {/* Bas */}
      <polygon points="16.5,14.5 20,16 19.5,21 14,23 8.5,21 8,16 11.5,14.5" fill="#111827" />
    </svg>
  );
}

function OutilsDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
          open ? 'text-primary-400 bg-primary-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
        }`}>
        Outils
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-56 rounded-xl border border-white/[0.08] shadow-card-hover z-50 overflow-hidden"
          style={{ background: 'var(--color-card)' }}>
          {OUTILS_ITEMS.map(({ to, label, Icon, desc }) => (
            <Link key={to} to={to} onClick={() => setOpen(false)}
              className="flex items-start gap-3 px-4 py-3 hover:bg-white/[0.04] transition-colors border-b border-white/[0.04] last:border-0">
              <div className="w-7 h-7 rounded-lg bg-primary-500/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon size={13} className="text-primary-400" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-200">{label}</p>
                <p className="text-[11px] text-gray-600 mt-0.5">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { user, logout, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.05]"
      style={{ background: 'rgba(23,24,25,0.95)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <FootballLogo className="w-7 h-7 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
          <span className="hidden sm:block font-display font-bold text-[15px] text-white tracking-tight">
            Pro<span className="text-primary-400">nix</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Navigation principale">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-primary-400 bg-primary-500/10'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
                }`
              }>
              {label}
            </NavLink>
          ))}
          <OutilsDropdown />
        </nav>

        {/* Actions droite */}
        <div className="flex items-center gap-1 ml-auto">
          <NotificationBell />

          <button onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-colors"
            aria-label={`Mode ${theme === 'dark' ? 'clair' : 'sombre'}`}>
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin"
                  className="p-2 rounded-lg text-amber-400 hover:bg-white/[0.05] transition-colors"
                  aria-label="Admin">
                  <Shield size={17} />
                </Link>
              )}
              <Link to="/profil"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-colors"
                aria-label="Profil">
                <User size={17} />
              </Link>
              <button onClick={logout}
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                aria-label="Déconnexion">
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link to="/connexion" className="btn-secondary text-[13px] px-3 py-1.5" style={{ minHeight: 34 }}>
                Connexion
              </Link>
              <Link to="/inscription" className="btn-cta text-[13px] px-4 py-1.5 hidden sm:flex" style={{ minHeight: 34 }}>
                S'inscrire
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
