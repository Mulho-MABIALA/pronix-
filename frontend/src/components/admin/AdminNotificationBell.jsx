import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, UserPlus, CreditCard, AlertTriangle, MessageCircle, Check, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import api from '../../services/api';

// Cloche d'activité admin : nouveau utilisateur, paiement, signalement, ticket
// support... Poll léger (30s) — pas besoin de websocket pour ce volume d'events.
// Distinct de /admin/notifications (envoi de push aux utilisateurs finaux).

const TYPE_META = {
  NEW_USER:           { Icon: UserPlus,      className: 'bg-primary-500/15 text-primary-400' },
  NEW_PAYMENT:        { Icon: CreditCard,     className: 'bg-emerald-500/15 text-emerald-400' },
  NEW_REPORT:         { Icon: AlertTriangle,  className: 'bg-red-500/15 text-red-400' },
  NEW_SUPPORT_TICKET: { Icon: MessageCircle,  className: 'bg-orange-500/15 text-orange-400' },
};
const DEFAULT_META = { Icon: Bell, className: 'bg-overlay/[0.08] text-ink-3' };

export default function AdminNotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { data } = useQuery({
    queryKey: ['admin-activity'],
    queryFn: () => api.get('/admin/activity?limit=20').then((r) => r.data),
    refetchInterval: 30_000,
  });

  const items = data?.data || [];
  const unreadCount = data?.unreadCount || 0;

  const markReadMutation = useMutation({
    mutationFn: (id) => api.patch(`/admin/activity/${id}/read`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-activity'] }),
  });
  const markAllReadMutation = useMutation({
    mutationFn: () => api.patch('/admin/activity/read-all'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-activity'] }),
  });

  // Fermer au clic extérieur
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClickItem = (item) => {
    if (!item.isRead) markReadMutation.mutate(item.id);
    setOpen(false);
    if (item.link) navigate(item.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-overlay/[0.05] border border-overlay/[0.11] text-ink-3 hover:text-ink-1 hover:bg-overlay/[0.09] transition-all"
        aria-label="Notifications"
      >
        <Bell size={15} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl border border-overlay/[0.11] shadow-2xl z-50 overflow-hidden animate-unfold"
          style={{ background: 'var(--color-card)', transformOrigin: 'top right' }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-overlay/[0.06]">
            <p className="text-sm font-semibold text-ink-1">Activité récente</p>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllReadMutation.mutate()}
                disabled={markAllReadMutation.isPending}
                className="flex items-center gap-1 text-[11px] font-medium text-primary-400 hover:text-primary-300 transition-colors disabled:opacity-50"
              >
                {markAllReadMutation.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="text-xs text-ink-4 text-center py-8">Aucune activité pour le moment.</p>
            ) : (
              items.map((item) => {
                const meta = TYPE_META[item.type] || DEFAULT_META;
                const { Icon } = meta;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleClickItem(item)}
                    className={`w-full flex items-start gap-3 px-4 py-3 text-left border-b border-overlay/[0.04] last:border-0 transition-colors hover:bg-overlay/[0.03] ${
                      !item.isRead ? 'bg-primary-500/[0.03]' : ''
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${meta.className}`}>
                      <Icon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-ink-2 truncate flex items-center gap-1.5">
                        {item.title}
                        {!item.isRead && <span className="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0" />}
                      </p>
                      <p className="text-[12px] text-ink-3 leading-snug mt-0.5 line-clamp-2">{item.message}</p>
                      <p className="text-[10px] text-ink-4 mt-1">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
