import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { User, LogOut, Shield, ChevronDown, Filter, Zap, TrendingUp, BarChart2, Download, Search, Layers, Wallet, BookOpen, Brain, Bot } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

import NotificationBell from '../ui/NotificationBell';
import SearchBar from '../ui/SearchBar';
import { usePWAInstall } from '../../hooks/usePWAInstall';

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

/** Switcher FR / EN compact */
function LangSwitcher() {
  const { i18n } = useTranslation();
  const lang = i18n.language?.startsWith('en') ? 'en' : 'fr';

  const toggle = () => i18n.changeLanguage(lang === 'fr' ? 'en' : 'fr');

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-0 rounded-lg border border-white/[0.08] overflow-hidden text-[11px] font-bold"
      aria-label="Changer de langue / Change language"
    >
      {['fr', 'en'].map((l) => (
        <span
          key={l}
          className={`px-2 py-1.5 transition-colors ${
            lang === l
              ? 'bg-primary-500/20 text-primary-400'
              : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          {l.toUpperCase()}
        </span>
      ))}
    </button>
  );
}

function OutilsDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const SECTIONS = [
    {
      label: 'Outils',
      items: [
        { to: '/outils/filtres',      label: t('tools.filters'),      Icon: Filter,     desc: 'Filtrez par marché et confiance',      color: 'text-blue-400 bg-blue-500/10' },
        { to: '/outils/machine',      label: t('tools.generator'),    Icon: Zap,        desc: 'Créez votre ticket optimisé',          color: 'text-amber-400 bg-amber-500/10' },
        { to: '/outils/stats-ligues', label: t('tools.statsLeagues'), Icon: BarChart2,  desc: 'Buts, BTTS, O2.5 par compétition',    color: 'text-purple-400 bg-purple-500/10' },
      ],
    },
    {
      label: 'Communauté',
      items: [
        { to: '/combos',              label: 'Combinés',              Icon: Layers,    desc: 'Coupons multi-matchs partagés',         color: 'text-orange-400 bg-orange-500/10' },
        { to: '/portefeuille-virtuel',label: 'Portefeuille virtuel',  Icon: Wallet,    desc: 'Simuler des paris sans risque',         color: 'text-yellow-400 bg-yellow-500/10' },
      ],
    },
    {
      label: 'Mon espace',
      items: [
        { to: '/mes-paris',           label: 'Mon carnet de paris',   Icon: BookOpen,  desc: 'Suivi de tes paris et ROI',            color: 'text-violet-400 bg-violet-500/10' },
        { to: '/mes-paris',           label: 'Coach Personnel IA',    Icon: Brain,     desc: 'Conseils IA selon tes stats',          color: 'text-pink-400 bg-pink-500/10' },
      ],
    },
    {
      label: 'Intelligence IA',
      items: [
        { to: '/pronostics',          label: 'Pronostics IA',         Icon: Bot,       desc: 'Picks générés par le Tipster IA',      color: 'text-primary-400 bg-primary-500/10' },
      ],
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
          open ? 'text-select-400 bg-select-500/10' : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.05]'
        }`}>
        {t('nav.tools')}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 w-64 rounded-xl border border-white/[0.08] shadow-card-hover z-50 overflow-hidden"
          style={{ background: 'var(--color-card)' }}>
          {SECTIONS.map((section, si) => (
            <div key={section.label}>
              {/* Séparateur entre sections */}
              {si > 0 && <div className="mx-4 border-t border-white/[0.05]" />}
              <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-gray-600 uppercase tracking-widest">
                {section.label}
              </p>
              {section.items.map(({ to, label, Icon, desc, color }) => (
                <Link key={`${to}-${label}`} to={to} onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/[0.04] transition-colors">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                    <Icon size={13} />
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-gray-200">{label}</p>
                    <p className="text-[11px] text-gray-500">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          ))}
          <div className="pb-2" />
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { t } = useTranslation();
  const { user, logout, isAdmin } = useAuth();
  const { isInstallable, install } = usePWAInstall();
  const [searchOpen, setSearchOpen] = useState(false);

  const NAV_LINKS = [
    { to: '/matchs',      label: t('nav.matches') },
    { to: '/pronostics',  label: t('nav.pronostics') },
    { to: '/classements', label: t('nav.standings') },
    { to: '/tipsters',    label: t('nav.tipsters') },
  ];

  return (
    <>
    <header className="sticky top-0 z-50 border-b border-white/[0.05]"
      style={{ background: 'rgba(23,24,25,0.95)', backdropFilter: 'blur(16px)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <FootballLogo className="w-7 h-7 drop-shadow-[0_0_6px_rgba(99,102,241,0.5)]" />
          <span className="hidden sm:block font-display font-bold text-[15px] text-white tracking-tight">
            fp<span className="text-primary-400">ronix</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label="Navigation principale">
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-select-400 bg-select-500/10'
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
          {/* Bouton recherche */}
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-colors"
            aria-label={t('search.open', 'Rechercher')}
          >
            <Search size={17} />
          </button>

          <NotificationBell />

          {/* Bouton installer PWA (visible seulement si installable) */}
          {isInstallable && (
            <button
              onClick={install}
              className="p-2 rounded-lg text-primary-400 hover:text-primary-300 hover:bg-primary-500/10 transition-colors"
              aria-label={t('pwa.installHeader')}
              title={t('pwa.installHeader')}
            >
              <Download size={17} />
            </button>
          )}

          {/* Langue : visible desktop + utilisateur connecté mobile ; caché mobile non-connecté */}
          <div className={user ? 'block' : 'hidden md:block'}>
            <LangSwitcher />
          </div>

          {user ? (
            <>
              {isAdmin && (
                <Link to="/admin"
                  className="p-2 rounded-lg text-amber-400 hover:bg-white/[0.05] transition-colors"
                  aria-label={t('nav.admin')}>
                  <Shield size={17} />
                </Link>
              )}
              <Link to="/profil"
                className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-white/[0.05] transition-colors"
                aria-label={t('nav.profile')}>
                <User size={17} />
              </Link>
              <button onClick={logout}
                className="p-2 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/[0.05] transition-colors"
                aria-label={t('nav.logout')}>
                <LogOut size={17} />
              </button>
            </>
          ) : (
            <div className="flex items-center gap-2 ml-1">
              <Link to="/connexion"
                className="btn-secondary text-[13px] px-3 py-1.5"
                style={{ minHeight: 44 }}>
                {t('nav.login')}
              </Link>
              <Link to="/inscription"
                className="btn-cta text-[13px] px-4 py-1.5 hidden sm:flex"
                style={{ minHeight: 44 }}>
                {t('nav.register')}
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>

    {/* Search overlay */}
    {searchOpen && <SearchBar onClose={() => setSearchOpen(false)} />}
  </>
  );
}
