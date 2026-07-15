/**
 * PWABanner — Invite l'utilisateur à installer l'app.
 * - Android/Desktop : utilise beforeinstallprompt
 * - iOS Safari : affiche les instructions manuelles (Share → Écran d'accueil)
 */

import { useState, useEffect } from 'react';
import { Download, X, Share } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePWAInstall } from '../../hooks/usePWAInstall';

const DISMISSED_KEY = 'fpronix_pwa_dismissed';

// Détection iOS Safari
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isInStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export default function PWABanner() {
  const { t } = useTranslation();
  const { isInstallable, install } = usePWAInstall();
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    const ios = isIOS();
    const standalone = isInStandaloneMode();

    if (ios && !standalone) {
      // iOS Safari : montrer les instructions manuelles
      setIosMode(true);
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    } else if (!ios && isInstallable) {
      // Android / Desktop : prompt natif
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleInstall = async () => {
    const accepted = await install();
    if (accepted) setVisible(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  };

  if (!visible) return null;

  // Banner iOS — instructions manuelles
  if (iosMode) {
    return (
      <div
        role="alert"
        className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50
                   bg-surface-800 border border-white/[0.10] rounded-2xl shadow-card-hover
                   p-4 flex items-start gap-3 animate-slide-up"
      >
        <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
          <Share size={18} className="text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-100">Installer fpronix</p>
          <p className="text-xs text-gray-400 mt-1 leading-snug">
            Appuyez sur{' '}
            <span className="inline-flex items-center gap-1 text-primary-400 font-semibold">
              <Share size={11} /> Partager
            </span>
            {' '}puis{' '}
            <span className="text-primary-400 font-semibold">"Sur l'écran d'accueil"</span>
            {' '}pour installer l'app.
          </p>
          <button
            onClick={handleDismiss}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors mt-2"
          >
            Fermer
          </button>
        </div>
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

  // Banner Android / Desktop
  return (
    <div
      role="alert"
      className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50
                 bg-surface-800 border border-white/[0.10] rounded-2xl shadow-card-hover
                 p-4 flex items-start gap-3 animate-slide-up"
    >
      <div className="w-10 h-10 rounded-xl bg-primary-500/15 flex items-center justify-center shrink-0">
        <Download size={18} className="text-primary-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-100">{t('pwa.install')}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{t('pwa.installDesc')}</p>
        <div className="flex items-center gap-2 mt-3">
          <button onClick={handleInstall} className="btn-primary text-xs px-3 py-1.5 h-auto">
            {t('pwa.installBtn')}
          </button>
          <button onClick={handleDismiss} className="text-xs text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5">
            {t('pwa.dismiss')}
          </button>
        </div>
      </div>
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
