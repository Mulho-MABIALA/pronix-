import { useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function MatchReminderButton({ matchId, scheduledAt, size = 16 }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  // Don't show if match already started
  const isPast = scheduledAt && new Date(scheduledAt) <= new Date();
  const active = !!user && !isPast;

  // Important : tous les hooks doivent être appelés inconditionnellement à
  // chaque rendu (Rules of Hooks). Le "return null" ne doit intervenir
  // qu'après, dans le JSX — sinon, quand `user` passe de null à défini
  // (chargement de la session au montage), ce même composant appelle un
  // nombre de hooks différent d'un rendu à l'autre → crash React #300.
  const { data } = useQuery({
    queryKey: ['reminder', matchId],
    queryFn: () =>
      api.get('/reminders').then((r) => r.data.data.some((rem) => rem.matchId === matchId)),
    enabled: active,
    staleTime: 30_000,
  });

  const hasReminder = !!data;

  const setMutation = useMutation({
    mutationFn: () => api.post(`/matches/${matchId}/reminder`, { minutesBefore: 60 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder', matchId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast(t('matches.reminderSet', 'Rappel activé — 1h avant le match'), 'success');
    },
    onError: () => toast(t('matches.reminderError'), 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/matches/${matchId}/reminder`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminder', matchId] });
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast(t('matches.reminderRemoved', 'Rappel supprimé'), 'info');
    },
  });

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (hasReminder) {
      deleteMutation.mutate();
    } else {
      setMutation.mutate();
    }
  };

  const isLoading = setMutation.isPending || deleteMutation.isPending;

  if (!active) return null;

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-1.5 rounded-lg transition-colors ${
        hasReminder
          ? 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
          : 'text-ink-4 hover:text-ink-3 hover:bg-overlay/[0.06]'
      }`}
      aria-label={hasReminder ? t('matches.removeReminder') : t('matches.activateReminder')}
      title={hasReminder ? t('matches.reminderActiveTooltip') : t('matches.reminderTooltip')}
    >
      {hasReminder ? <Bell size={size} className="fill-current" /> : <Bell size={size} />}
    </button>
  );
}
