import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { User, LogOut, Shield, ChevronDown, Filter, Zap, TrendingUp, BarChart2, Download, Search, BookOpen, Brain, ArrowLeftRight, Sun, Moon, Newspaper, Rss } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

import NotificationBell from '../ui/NotificationBell';
import SearchBar from '../ui/SearchBar';
import { usePWAInstall } from '../../hooks/usePWAInstall';

function FootballLogo() {
  return (
    <img
      src="/logo-circle.png"
      alt="fpronix logo"
      className="w-8 h-8 rounded-full shrink-0"
    />
  );
}

/** Switcher de langue — FR / EN / ES / PT */
const LANGS = [
  { code: 'fr', label: 'FR', name: 'Français', flag: '🇫🇷' },
  { code: 'en', label: 'EN', name: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'ES', name: 'Español', flag: '🇪🇸' },
  { code: 'pt', label: 'PT', name: 'Português', flag: '🇵🇹' },
];

function LangSwitcher() {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const current = LANGS.find((l) => i18n.language?.startsWith(l.code)) || LANGS[0];

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const select = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-overlay/[0.08] text-[11px] font-bold transition-colors ${
          open ? 'text-primary-400 bg-primary-500/10' : 'text-ink-3 hover:text-ink-2'
        }`}
        aria-label={t('header.langSwitcherLabel')}
      >
        <span aria-hidden="true">{current.flag}</span>
        {current.label}
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 rounded-xl border border-overlay/[0.08] shadow-card-hover z-50 py-1.5 overflow-hidden"
          style={{ background: 'var(--color-card)', width: 160 }}
        >
          {LANGS.map(({ code, label, name, flag }) => (
            <button
              key={code}
              onClick={() => select(code)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors ${
                current.code === code
                  ? 'text-primary-400 bg-primary-500/10'
                  : 'text-ink-2 hover:bg-overlay/[0.05]'
              }`}
            >
              <span aria-hidden="true">{flag}</span>
              <span className="font-bold w-6">{label}</span>
              <span className="text-ink-3">{name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Bascule mode clair / sombre */
function ThemeToggle() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.05] transition-colors"
      aria-label={isLight ? t('header.switchToDark', 'Passer en mode sombre') : t('header.switchToLight', 'Passer en mode clair')}
      title={isLight ? t('header.switchToDark', 'Passer en mode sombre') : t('header.switchToLight', 'Passer en mode clair')}
    >
      {isLight ? <Moon size={17} /> : <Sun size={17} />}
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
      sectionKey: 'tools',
      label: t('header.dropdown.sections.tools'),
      items: [
        { to: '/outils/filtres',      label: t('tools.filters'),      Icon: Filter,     desc: t('tools.filtersDesc'),      color: 'text-blue-400 bg-blue-500/10' },
        { to: '/outils/machine',      label: t('tools.generator'),    Icon: Zap,        desc: t('tools.generatorDesc'),    color: 'text-amber-400 bg-amber-500/10' },
        { to: '/outils/stats-ligues', label: t('tools.statsLeagues'), Icon: BarChart2,  desc: t('tools.statsLeaguesDesc'), color: 'text-purple-400 bg-purple-500/10' },
        { to: '/comparateur',         label: t('tools.comparator'),   Icon: ArrowLeftRight, desc: t('tools.comparatorDesc'), color: 'text-fuchsia-400 bg-fuchsia-500/10' },
      ],
    },
    {
      sectionKey: 'mySpace',
      label: t('header.dropdown.sections.mySpace'),
      items: [
        { to: '/mes-paris',           label: t('header.dropdown.items.betTracker'),  Icon: BookOpen, desc: t('header.dropdown.items.betTrackerDesc'), color: 'text-violet-400 bg-violet-500/10' },
        { to: '/mes-paris',           label: t('header.dropdown.items.aiCoach'),     Icon: Brain,    desc: t('header.dropdown.items.aiCoachDesc'),    color: 'text-pink-400 bg-pink-500/10' },
      ],
    },
    {
      sectionKey: 'content',
      label: t('header.dropdown.sections.content'),
      items: [
        { to: '/blog', label: t('header.dropdown.items.blog'), Icon: Newspaper, desc: t('header.dropdown.items.blogDesc'), color: 'text-orange-400 bg-orange-500/10' },
        { to: '/actualites', label: t('header.dropdown.items.news'), Icon: Rss, desc: t('header.dropdown.items.newsDesc'), color: 'text-amber-400 bg-amber-500/10' },
      ],
    },
  ];

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
          open ? 'text-select-400 bg-select-500/10' : 'text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.05]'
        }`}>
        {t('nav.tools')}
        <ChevronDown size={13} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-1.5 rounded-xl border border-overlay/[0.08] shadow-card-hover z-50 p-3"
          style={{ background: 'var(--color-card)', width: 520 }}
        >
          <div className="grid grid-cols-2 gap-x-3">
            {SECTIONS.map((section, si) => (
              <div key={section.label} className={si >= 2 ? 'mt-2' : ''}>
                <p className="px-2 pt-1 pb-1.5 text-xs font-bold text-ink-4 uppercase tracking-widest">
                  {section.label}
                </p>
                {section.items.map(({ to, label, Icon, desc, color }) => (
                  <Link key={`${to}-${label}`} to={to} onClick={() => setOpen(false)}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-overlay/[0.05] transition-colors">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={13} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12px] font-semibold text-ink-2 truncate">{label}</p>
                      <p className="text-xs text-ink-3 truncate">{desc}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ))}
          </div>
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
    <header className="sticky top-0 z-50 border-b border-overlay/[0.05]"
      style={{ background: 'rgb(var(--surface-900-rgb) / 0.95)', backdropFilter: 'blur(16px)', paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-6">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
          <FootballLogo />
          <span className="hidden sm:block font-display font-bold text-[15px] text-ink-1 tracking-tight">
            fp<span className="text-primary-400">ronix</span>
          </span>
        </Link>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-0.5 flex-1" aria-label={t('header.mainNavLabel')}>
          {NAV_LINKS.map(({ to, label }) => (
            <NavLink key={to} to={to}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors duration-150 ${
                  isActive
                    ? 'text-select-400 bg-select-500/10'
                    : 'text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.05]'
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
            className="p-2 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.05] transition-colors"
            aria-label={t('search.open', 'Rechercher')}
          >
            <Search size={17} />
          </button>

          <NotificationBell />

          {/* Mode clair / sombre — visible partout (desktop + mobile) */}
          <ThemeToggle />

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
                  className="p-2 rounded-lg text-amber-400 hover:bg-overlay/[0.05] transition-colors"
                  aria-label={t('nav.admin')}>
                  <Shield size={17} />
                </Link>
              )}
              <Link to="/profil"
                className="p-2 rounded-lg text-ink-4 hover:text-ink-2 hover:bg-overlay/[0.05] transition-colors"
                aria-label={t('nav.profile')}>
                <User size={17} />
              </Link>
              <button onClick={logout}
                className="hidden md:inline-flex p-2 rounded-lg text-ink-3 hover:text-red-400 hover:bg-overlay/[0.05] transition-colors"
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
