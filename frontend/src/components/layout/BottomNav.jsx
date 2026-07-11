import { NavLink } from 'react-router-dom';
import { Home, Calendar, TrendingUp, Zap, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function BottomNav() {
  const { t } = useTranslation();

  const NAV_ITEMS = [
    { to: '/',               label: t('nav.home'),      Icon: Home,       end: true },
    { to: '/matchs',         label: t('nav.matches'),   Icon: Calendar,   end: false },
    { to: '/pronostics',     label: t('nav.pronostics'),Icon: TrendingUp, end: false },
    { to: '/outils/machine', label: t('nav.generator'), Icon: Zap,        end: false },
    { to: '/profil',         label: t('nav.profile'),   Icon: User,       end: false },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] safe-area-inset-bottom"
      style={{ background: 'rgba(23,24,25,0.97)', backdropFilter: 'blur(16px)' }}
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
                <span className="text-[9px] font-semibold tracking-wide">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
