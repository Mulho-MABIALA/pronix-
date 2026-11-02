import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { WifiOff, ServerCrash } from 'lucide-react';

// ─── Bandeau « hors ligne » / « serveur injoignable » ─────────────────────────
// - Hors ligne : le téléphone a perdu internet (fréquent en mobile) → bandeau
//   jusqu'au retour du réseau.
// - Serveur injoignable : l'API ne répond pas (502/504, coupure, délai
//   dépassé) → bandeau jusqu'à la prochaine réponse réussie. Événements émis
//   par services/api.js. Remplace des pages vides ou des chargements infinis.
export default function ConnectionBanner() {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && navigator.onLine === false);
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    const down = () => setServerDown(true);
    const up = () => setServerDown(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    window.addEventListener('fpronix:server-down', down);
    window.addEventListener('fpronix:server-up', up);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
      window.removeEventListener('fpronix:server-down', down);
      window.removeEventListener('fpronix:server-up', up);
    };
  }, []);

  if (!offline && !serverDown) return null;
  const Icon = offline ? WifiOff : ServerCrash;
  return (
    <div role="status" className="sticky top-0 z-[60] bg-amber-500 text-black text-xs font-semibold px-4 py-2 flex items-center justify-center gap-2">
      <Icon size={14} />
      {offline ? t('errors.offline') : t('errors.serverDown')}
    </div>
  );
}
