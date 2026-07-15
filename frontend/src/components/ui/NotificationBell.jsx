import { useState } from 'react';
import { Bell, BellOff, X, Share } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../context/AuthContext';

function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

/**
 * NotificationBell
 * - size       : taille de l'icône (défaut 18)
 * - showLabel  : affiche "Alertes" sous l'icône (pour BottomNav)
 */
export default function NotificationBell({ size = 18, showLabel = false }) {
  const { user } = useAuth();
  const { supported, subscribed, loading, subscribe, unsubscribe } =
    usePushNotifications(user);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const ios = isIOS();
  const standalone = isStandalone();

  /* ── iOS non installée en PWA → pas de PushManager → guide d'installation ── */
  if (ios && !standalone) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowIOSHint((v) => !v)}
          className={`flex flex-col items-center justify-center gap-0.5 transition-colors rounded-xl
            ${showLabel ? 'flex-1 h-full' : 'p-2 rounded-lg hover:bg-surface-700'}
            text-gray-500 hover:text-gray-300`}
          aria-label="Notifications"
        >
          <div className={showLabel ? 'p-1 rounded-lg' : ''}>
            <BellOff size={size} strokeWidth={1.75} />
          </div>
          {showLabel && (
            <span className="text-[9px] font-semibold tracking-wide">Alertes</span>
          )}
        </button>

        {showIOSHint && (
          <>
            {/* Overlay pour fermer */}
            <div
              className="fixed inset-0 z-[80]"
              onClick={() => setShowIOSHint(false)}
            />
            {/* Tooltip */}
            <div
              className={`absolute z-[90] w-72 bg-surface-800 border border-white/10 rounded-2xl p-4 shadow-xl text-xs text-gray-300 space-y-2
                ${showLabel ? 'bottom-full mb-3 right-0' : 'top-full mt-2 right-0'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="font-semibold text-gray-100 text-sm">
                  Notifications iPhone
                </p>
                <button
                  onClick={() => setShowIOSHint(false)}
                  className="p-1 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-white/[0.05]"
                >
                  <X size={14} />
                </button>
              </div>

              <p className="text-gray-400 leading-snug">
                Pour recevoir des notifications push, installe d'abord l'app depuis Safari :
              </p>

              <div className="space-y-1.5 text-gray-300 leading-snug">
                <p>
                  1. Appuie sur{' '}
                  <span className="inline-flex items-center gap-1 text-primary-400 font-semibold">
                    <Share size={10} /> Partager
                  </span>{' '}
                  en bas de Safari
                </p>
                <p>
                  2. Sélectionne{' '}
                  <span className="text-primary-400 font-semibold">
                    "Sur l'écran d'accueil"
                  </span>
                </p>
                <p>
                  3. Ouvre l'app installée et reviens activer les alertes ici
                </p>
              </div>

              <p className="text-gray-600 text-[10px] pt-1 border-t border-white/[0.06]">
                Nécessite iOS 16.4 ou plus récent
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  /* ── Navigateur vraiment non-supporté (vieux Android, etc.) ── */
  if (!supported) return null;

  /* ── Push supporté → toggle abonnement ── */
  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`flex flex-col items-center justify-center gap-0.5 transition-colors rounded-xl
        ${showLabel ? 'flex-1 h-full' : 'p-2 rounded-lg hover:bg-surface-700'}
        ${
          subscribed
            ? 'text-primary-400 hover:text-primary-300'
            : 'text-gray-400 hover:text-gray-200'
        }`}
      aria-label={
        subscribed ? 'Désactiver les notifications' : 'Activer les notifications'
      }
      title={
        subscribed
          ? 'Notifications activées — cliquer pour désactiver'
          : 'Activer les notifications push'
      }
    >
      <div className={showLabel ? 'p-1 rounded-lg' : ''}>
        {subscribed ? (
          <Bell size={size} strokeWidth={showLabel ? 1.75 : 1.75} />
        ) : (
          <BellOff size={size} strokeWidth={1.75} />
        )}
      </div>
      {showLabel && (
        <span className="text-[9px] font-semibold tracking-wide">Alertes</span>
      )}
    </button>
  );
}
