import { Bell, BellOff } from 'lucide-react';
import { usePushNotifications } from '../../hooks/usePushNotifications';

export default function NotificationBell() {
  const { supported, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) return null;

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
      title={subscribed ? 'Notifications activées — cliquez pour désactiver' : 'Activer les notifications push'}
    >
      {subscribed ? <Bell size={18} /> : <BellOff size={18} />}
    </button>
  );
}
