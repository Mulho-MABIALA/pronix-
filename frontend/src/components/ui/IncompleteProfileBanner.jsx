import { Link, useLocation } from 'react-router-dom';
import { UserCog, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

// Bannière discrète : pousse vers /profil tant qu'une info importante manque
// (pour l'instant : le numéro de téléphone). Facile à étendre plus tard en
// ajoutant d'autres champs à la condition `missing`.
export default function IncompleteProfileBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const location = useLocation();

  const missing = !!user?.profile && !user.profile.phone;

  // Rien à afficher : pas connecté, rien ne manque, ou déjà sur la page Profil.
  if (!user || !missing || location.pathname === '/profil') return null;

  return (
    <div
      className="relative flex items-center gap-3 px-4 py-2.5 text-sm"
      style={{
        background: 'rgba(59,130,246,0.08)',
        borderBottom: '1px solid rgba(59,130,246,0.2)',
      }}
    >
      <UserCog size={15} className="text-blue-400 shrink-0" />
      <p className="flex-1 text-[12px] text-blue-200/80 leading-tight">
        {t('incompleteProfileBanner.message')}
      </p>
      <Link
        to="/profil"
        className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-blue-400 hover:text-blue-300 border border-blue-500/40 rounded-lg px-2 py-1 transition-colors"
      >
        {t('incompleteProfileBanner.cta')}
        <ChevronRight size={12} />
      </Link>
    </div>
  );
}
