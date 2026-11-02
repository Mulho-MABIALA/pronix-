import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Wrench, RefreshCw } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// ─── Mode maintenance (activé depuis l'admin, cf. backend routes/maintenance.js) ─
// - Visiteurs et utilisateurs : écran « Maintenance en cours » à la place du site.
// - Admin : le site reste utilisable, avec un bandeau rouge pour ne pas oublier
//   de couper la maintenance.
// - /connexion et /admin restent accessibles : un admin doit pouvoir se
//   connecter pour désactiver la maintenance.
// État relu toutes les 60 s, et immédiatement si une requête reçoit 503
// MAINTENANCE (événement émis par services/api.js).
export default function MaintenanceGate({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ['maintenance'],
    queryFn: () => api.get('/maintenance').then((r) => r.data.data),
    refetchInterval: 60 * 1000,
    staleTime: 30 * 1000,
    retry: false,
  });

  useEffect(() => {
    const onMaintenance = () => queryClient.invalidateQueries({ queryKey: ['maintenance'] });
    window.addEventListener('fpronix:maintenance', onMaintenance);
    return () => window.removeEventListener('fpronix:maintenance', onMaintenance);
  }, [queryClient]);

  const enabled = !!data?.enabled;
  const isAdmin = user?.role === 'ADMIN';
  const openPath = pathname.startsWith('/connexion') || pathname.startsWith('/admin');

  if (enabled && !isAdmin && !openPath) return <MaintenanceScreen info={data} />;

  return (
    <>
      {enabled && isAdmin && <AdminMaintenanceBanner />}
      {children}
    </>
  );
}

function MaintenanceScreen({ info }) {
  const { t } = useTranslation();
  const until = info?.until ? new Date(info.until) : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6" style={{ background: 'var(--color-bg)' }}>
      <div className="max-w-md w-full text-center space-y-5">
        <img src="/logo-circle.png" alt="fpronix" className="w-20 h-20 rounded-full mx-auto" />
        <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
          <Wrench size={22} className="text-amber-400" />
        </div>
        <h1 className="font-display font-bold text-2xl text-ink-1">{t('maintenance.title')}</h1>
        <p className="text-ink-3 text-sm leading-relaxed">{info?.message || t('maintenance.defaultMessage')}</p>
        {until && until > new Date() && (
          <p className="text-sm font-semibold text-primary-400">
            {t('maintenance.backAt', { time: format(until, 'HH:mm'), date: format(until, 'dd/MM') })}
          </p>
        )}
        <button onClick={() => window.location.reload()} className="btn-secondary inline-flex items-center gap-2 text-sm">
          <RefreshCw size={14} /> {t('maintenance.retry')}
        </button>
        <p className="text-xs text-ink-4">{t('maintenance.note')}</p>
      </div>
    </div>
  );
}

function AdminMaintenanceBanner() {
  return (
    <div className="sticky top-0 z-[60] bg-red-600 text-white text-xs font-semibold text-center px-4 py-2">
      🔧 Mode maintenance ACTIF — le site est fermé aux visiteurs.{' '}
      <Link to="/admin" className="underline">Désactiver depuis l'admin</Link>
    </div>
  );
}
