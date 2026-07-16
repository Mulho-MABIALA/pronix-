import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Calendar, TrendingUp, User, LayoutGrid, X, Filter, Zap, BarChart2, Trophy, Users, ChevronRight, Download, Share, Smartphone, Wallet, Layers } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../../hooks/usePWAInstall';

// Détecte iOS
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}
// Détecte si l'app est déjà installée (standalone)
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

/** Drawer "Explorer" — liste tous les outils et sections */
function ExplorerDrawer({ open, onClose }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isInstallable, install } = usePWAInstall();
  const [showIOSHint, setShowIOSHint] = useState(false);

  const SECTIONS = [
    {
      label: t('nav.tools'),
      items: [
        { to: '/outils/machine',      label: t('tools.generator'),    Icon: Zap,      desc: t('tools.generatorDesc'),    color: 'text-amber-400 bg-amber-500/10' },
        { to: '/outils/filtres',      label: t('tools.filters'),      Icon: Filter,   desc: t('tools.filtersDesc'),      color: 'text-blue-400 bg-blue-500/10' },
        { to: '/outils/stats-ligues', label: t('tools.statsLeagues'), Icon: BarChart2, desc: t('tools.statsLeaguesDesc'), color: 'text-purple-400 bg-purple-500/10' },
      ],
    },
    {
      label: 'Communauté',
      items: [
        { to: '/classements',           label: t('nav.standings'),       Icon: Trophy,  desc: 'Classements des ligues',       color: 'text-green-400 bg-green-500/10' },
        { to: '/tipsters',              label: t('nav.tipsters'),        Icon: Users,   desc: 'Top pronostiqueurs',           color: 'text-primary-400 bg-primary-500/10' },
        { to: '/portefeuille-virtuel',  label: 'Portefeuille',           Icon: Wallet,  desc: 'Simuler des paris sans risque', color: 'text-yellow-400 bg-yellow-500/10' },
        { to: '/combos',               label: 'Combinés',               Icon: Layers,  desc: 'Coupons multi-matchs partagés',  color: 'text-orange-400 bg-orange-500/10' },
      ],
    },
  ];

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed bottom-0 left-0 right-0 z-[70] rounded-t-2xl border-t border-white/[0.08] animate-slide-up flex flex-col"
        style={{ background: 'rgba(23,24,25,0.98)', backdropFilter: 'blur(20px)', maxHeight: '85vh' }}>

        {/* Handle — fixe, ne scrolle pas */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header — fixe, ne scrolle pas */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] shrink-0">
          <p className="font-semibold text-gray-100 text-sm">Explorer fpronix</p>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Sections — scrollable */}
        <div className="overflow-y-auto flex-1 min-h-0 px-4 py-4 space-y-5" style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom))' }}>
          {SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-1">{section.label}</p>
              <div className="space-y-1.5">
                {section.items.map(({ to, label, Icon, desc, color }) => (
                  <button
                    key={to}
                    onClick={() => { navigate(to); onClose(); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-colors text-left"
                  >
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                      <Icon size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200">{label}</p>
                      <p className="text-xs text-gray-500 truncate">{desc}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ── Installer l'application ─────────────────────── */}
          {!isStandalone() && (
            <div>
              <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-2 px-1">Application</p>
              <div className="space-y-1.5">
                {isInstallable ? (
                  /* Android Chrome / Edge — prompt natif */
                  <button
                    onClick={async () => { await install(); onClose(); }}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/15 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-primary-400 bg-primary-500/15">
                      <Download size={17} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-primary-300">Installer l'app</p>
                      <p className="text-xs text-gray-500">Accès rapide depuis l'écran d'accueil</p>
                    </div>
                    <ChevronRight size={14} className="text-primary-500 shrink-0" />
                  </button>
                ) : isIOS() ? (
                  /* iOS Safari — instructions manuelles */
                  <div>
                    <button
                      onClick={() => setShowIOSHint((v) => !v)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 hover:bg-primary-500/15 transition-colors text-left"
                    >
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-primary-400 bg-primary-500/15">
                        <Smartphone size={17} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-primary-300">Installer l'app</p>
                        <p className="text-xs text-gray-500">Ajouter à l'écran d'accueil</p>
                      </div>
                      <ChevronRight size={14} className={`text-primary-500 shrink-0 transition-transform ${showIOSHint ? 'rotate-90' : ''}`} />
                    </button>
                    {showIOSHint && (
                      <div className="mt-2 p-3 rounded-xl bg-white/[0.04] border border-white/[0.06] text-xs text-gray-300 space-y-2">
                        <p className="font-semibold text-gray-100">Comment installer :</p>
                        <p>1. Appuie sur <span className="text-primary-400 font-semibold">Partager</span> <Share size={11} className="inline" /> en bas de Safari</p>
                        <p>2. Fais défiler et sélectionne <span className="text-primary-400 font-semibold">"Sur l'écran d'accueil"</span></p>
                        <p>3. Appuie sur <span className="text-primary-400 font-semibold">Ajouter</span></p>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Autre navigateur — instructions génériques */
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-gray-400 bg-white/[0.06]">
                        <Smartphone size={17} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-300">Installer l'app</p>
                        <p className="text-xs text-gray-500">Utilise le menu de ton navigateur → "Ajouter à l'écran d'accueil"</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default function BottomNav() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const NAV_ITEMS = [
    { to: '/',           label: t('nav.home'),       Icon: Home,        end: true },
    { to: '/matchs',     label: t('nav.matches'),    Icon: Calendar,    end: false },
    { to: '/pronostics', label: t('nav.pronostics'), Icon: TrendingUp,  end: false },
    { to: '/profil',     label: t('nav.profile'),    Icon: User,        end: false },
  ];

  return (
    <>
      <ExplorerDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06]"
        style={{
          background: 'rgba(23,24,25,0.97)',
          backdropFilter: 'blur(16px)',
          /* Étend le fond derrière l'indicateur home d'iPhone */
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
        aria-label="Navigation mobile"
      >
        <div className="flex items-center justify-around h-16 px-2">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-colors ${
                  isActive ? 'text-select-400' : 'text-gray-600 hover:text-gray-400'
                }`
              }
              aria-label={label}
            >
              {({ isActive }) => (
                <>
                  <div className={`p-1 rounded-lg transition-colors ${isActive ? 'bg-select-500/15' : ''}`}>
                    <Icon size={20} strokeWidth={isActive ? 2.5 : 1.75} />
                  </div>
                  <span className="text-[11px] font-semibold tracking-wide">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* Bouton Explorer */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex flex-col items-center justify-center gap-1 flex-1 h-full rounded-xl transition-colors ${
              drawerOpen ? 'text-select-400' : 'text-gray-600 hover:text-gray-400'
            }`}
            aria-label={t('nav.explorer')}
          >
            <div className={`p-1 rounded-lg transition-colors ${drawerOpen ? 'bg-select-500/15' : ''}`}>
              <LayoutGrid size={20} strokeWidth={drawerOpen ? 2.5 : 1.75} />
            </div>
            <span className="text-[11px] font-semibold tracking-wide">{t('nav.explorer')}</span>
          </button>
        </div>
      </nav>
    </>
  );
}
