import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, X } from 'lucide-react';
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

/* ─── Bottom sheet iOS (rendu via portal pour éviter tout conflit z-index) ── */
function IOSBottomSheet({ onClose }) {
  const STEPS = [
    'Appuie sur Partager ↑ en bas de Safari',
    "Sélectionne \"Sur l'écran d'accueil\"",
    "Lance l'app installée et reviens activer les alertes",
  ];

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[301] rounded-t-2xl animate-slide-up"
        style={{
          background: 'rgba(24,25,28,0.99)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-white/[0.06]">
          <p className="font-semibold text-gray-100 text-base">
            Activer les notifications
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-500 hover:text-gray-300 hover:bg-white/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenu */}
        <div className="px-5 pt-4 space-y-5">
          <p className="text-sm text-gray-400 leading-relaxed">
            Sur iPhone, les notifications push nécessitent l'app installée
            depuis Safari <span className="text-gray-500">(iOS 16.4+)</span>.
          </p>

          {/* Étapes */}
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-gray-300 leading-snug pt-1">{step}</p>
              </div>
            ))}
          </div>

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-gray-200 transition-colors"
            style={{ background: 'rgba(255,255,255,0.07)' }}
          >
            Compris
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ─── Composant principal ────────────────────────────────────────────────────── */
export default function NotificationBell({ size = 18 }) {
  const { user } = useAuth();
  const { supported, subscribed, loading, subscribe, unsubscribe } =
    usePushNotifications(user);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const ios        = isIOS();
  const standalone = isStandalone();

  /* ── iOS non installée → guide d'installation ── */
  if (ios && !standalone) {
    return (
      <>
        <button
          onClick={() => setShowIOSHint(true)}
          className="p-2 rounded-lg transition-colors text-gray-500 hover:text-gray-300 hover:bg-surface-700"
          aria-label="Activer les notifications"
          title="Notifications push — installer l'app d'abord"
        >
          <BellOff size={size} strokeWidth={1.75} />
        </button>

        {showIOSHint && (
          <IOSBottomSheet onClose={() => setShowIOSHint(false)} />
        )}
      </>
    );
  }

  /* ── Navigateur non supporté ── */
  if (!supported) return null;

  /* ── Push disponible → toggle abonnement ── */
  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={loading}
      className={`p-2 rounded-lg transition-colors ${
        subscribed
          ? 'text-primary-400 hover:text-primary-300 hover:bg-surface-700'
          : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700'
      }`}
      aria-label={subscribed ? 'Désactiver les notifications' : 'Activer les notifications'}
      title={subscribed ? 'Notifications activées' : 'Activer les notifications push'}
    >
      {subscribed
        ? <Bell size={size} strokeWidth={1.75} />
        : <BellOff size={size} strokeWidth={1.75} />
      }
    </button>
  );
}
