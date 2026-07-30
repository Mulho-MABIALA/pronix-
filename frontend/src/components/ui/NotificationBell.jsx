import { useState } from 'react';
import { createPortal } from 'react-dom';
import { Bell, BellOff, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

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
  const { t } = useTranslation();
  const STEPS = [
    t('notificationBell.iosStep1'),
    t('notificationBell.iosStep2'),
    t('notificationBell.iosStep3'),
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
          background: 'rgb(var(--surface-900-rgb) / 0.99)',
          borderTop: '1px solid rgb(var(--overlay-rgb) / 0.08)',
          paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-overlay/20" />
        </div>

        {/* En-tête */}
        <div className="flex items-center justify-between px-5 pb-4 border-b border-overlay/[0.06]">
          <p className="font-semibold text-ink-1 text-base">
            {t('notificationBell.enableNotifications')}
          </p>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-ink-3 hover:text-ink-2 hover:bg-overlay/[0.06] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Contenu */}
        <div className="px-5 pt-4 space-y-5">
          <p className="text-sm text-ink-4 leading-relaxed">
            {t('notificationBell.iosIntro')} <span className="text-ink-3">(iOS 16.4+)</span>.
          </p>

          {/* Étapes */}
          <div className="space-y-3">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-primary-500/20 text-primary-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-ink-3 leading-snug pt-1">{step}</p>
              </div>
            ))}
          </div>

          {/* Bouton fermer */}
          <button
            onClick={onClose}
            className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-ink-2 transition-colors"
            style={{ background: 'rgb(var(--overlay-rgb) / 0.07)' }}
          >
            {t('notificationBell.gotIt')}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ─── Composant principal ────────────────────────────────────────────────────── */
export default function NotificationBell({ size = 18 }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { user } = useAuth();
  const { supported, subscribed, loading, subscribe, unsubscribe } =
    usePushNotifications(user);
  const [showIOSHint, setShowIOSHint] = useState(false);

  const handleToggle = async () => {
    if (subscribed) {
      await unsubscribe();
      toast(t('notifications.unsubscribed'), 'info');
    } else {
      await subscribe();
      // Le toast success est affiché seulement si la permission est accordée
      // (subscribe() ne lève pas d'erreur si refusé, donc on vérifie le résultat via subscribed
      // au prochain render — on déclenche le toast après un micro-délai)
      setTimeout(() => {
        if (Notification.permission === 'granted') {
          toast(t('notifications.subscribed'), 'success');
        }
      }, 800);
    }
  };

  const ios        = isIOS();
  const standalone = isStandalone();

  /* ── iOS non installée → guide d'installation ── */
  if (ios && !standalone) {
    return (
      <>
        <button
          onClick={() => setShowIOSHint(true)}
          className="p-2 rounded-lg transition-colors text-ink-3 hover:text-ink-2 hover:bg-surface-700"
          aria-label={t('notificationBell.enableNotifications')}
          title={t('notificationBell.iosInstallFirst')}
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
      onClick={handleToggle}
      disabled={loading}
      className={`p-2 rounded-lg transition-colors ${
        subscribed
          ? 'text-primary-400 hover:text-primary-300 hover:bg-surface-700'
          : 'text-ink-4 hover:text-ink-2 hover:bg-surface-700'
      }`}
      aria-label={subscribed ? t('notificationBell.disableNotifications') : t('notificationBell.enableNotifications')}
      title={subscribed ? t('notificationBell.notificationsEnabled') : t('notificationBell.enablePushNotifications')}
    >
      {subscribed
        ? <Bell size={size} strokeWidth={1.75} />
        : <BellOff size={size} strokeWidth={1.75} />
      }
    </button>
  );
}
