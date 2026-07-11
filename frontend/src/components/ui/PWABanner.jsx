/**
 * PWABanner — Invite l'utilisateur à installer l'app sur l'écran d'accueil.
 * Apparaît automatiquement quand le navigateur déclenche beforeinstallprompt.
 * Disparaît définitivement si l'utilisateur clique "Plus tard" (stocké en localStorage).
 */

import { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const DISMISSED_KEY = 'fpronix_pwa_dismissed';

export default function PWABanner() {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Ne pas afficher si déjà refusé
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50
                 bg-surface-800 border border-white/[0.10] rounded-2xl shadow-card-hover
                 p-4 flex items-start gap-3 animate-slide-up"
    >
      {/* Icône */}
      <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
        <Download size={18} className="text-primary-400" />
      </div>

      {/* Texte */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-100">{t('pwa.install')}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t('pwa.installDesc')}</p>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={handleInstall}
            className="btn-primary text-xs px-3 py-1.5 h-auto"
          >
            {t('pwa.installBtn')}
          </button>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5"
          >
            {t('pwa.dismiss')}
          </button>
        </div>
      </div>

      {/* Fermer */}
      <button
        onClick={handleDismiss}
        className="p-1 rounded-lg text-gray-600 hover:text-gray-400 hover:bg-white/[0.05] transition-colors shrink-0"
        aria-label="Fermer"
      >
        <X size={14} />
      </button>
    </div>
  );
}
