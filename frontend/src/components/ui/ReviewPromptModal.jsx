import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

// Popup périodique (1x/mois par défaut, cf. backend routes/reviews.js) demandant
// une note (étoiles) + un commentaire optionnel sur l'app. L'éligibilité est
// vérifiée côté serveur à chaque montage — le composant reste monté toute la
// session (via Layout) donc un seul appel réseau par visite.
export default function ReviewPromptModal() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const { data } = useQuery({
    queryKey: ['review-should-prompt'],
    queryFn: () => api.get('/reviews/should-prompt').then((r) => r.data),
    enabled: !!user,
    staleTime: Infinity,
  });

  const submit = useMutation({
    mutationFn: () => api.post('/reviews', { rating, comment: comment.trim() || undefined }),
    onSuccess: () => {
      toast(t('reviewPrompt.thanks'), 'success');
      setDismissed(true);
      qc.setQueryData(['review-should-prompt'], { data: { shouldPrompt: false } });
    },
    onError: () => toast(t('reviewPrompt.error'), 'error'),
  });

  const dismiss = useMutation({
    mutationFn: () => api.post('/reviews/dismiss'),
    onSettled: () => {
      setDismissed(true);
      qc.setQueryData(['review-should-prompt'], { data: { shouldPrompt: false } });
    },
  });

  const shouldPrompt = data?.data?.shouldPrompt;
  if (!user || !shouldPrompt || dismissed) return null;

  const displayRating = hoverRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-sm rounded-2xl border border-overlay/[0.1] p-5 space-y-4"
        style={{ background: 'var(--color-card)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-ink-1 text-sm">{t('reviewPrompt.title')}</h3>
            <p className="text-xs text-ink-3 mt-1 leading-relaxed">{t('reviewPrompt.subtitle')}</p>
          </div>
          <button
            onClick={() => dismiss.mutate()}
            className="text-ink-4 hover:text-ink-2 transition-colors shrink-0"
            aria-label={t('reviewPrompt.later')}
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex items-center justify-center gap-1.5 py-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHoverRating(n)}
              onMouseLeave={() => setHoverRating(0)}
              className="p-1 transition-transform hover:scale-110"
              aria-label={t('reviewPrompt.starLabel', { n })}
            >
              <Star
                size={28}
                className={displayRating >= n ? 'text-amber-400 fill-amber-400' : 'text-ink-4'}
              />
            </button>
          ))}
        </div>

        {rating > 0 && (
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t('reviewPrompt.commentPlaceholder')}
            rows={3}
            maxLength={1000}
            className="w-full bg-surface-700/60 border border-overlay/[0.07] rounded-xl px-3 py-2 text-sm text-ink-2 placeholder-ph-a focus:outline-none focus:border-primary-500 resize-none"
          />
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={() => dismiss.mutate()} className="btn-secondary flex-1 py-2.5 text-sm">
            {t('reviewPrompt.later')}
          </button>
          <button
            onClick={() => submit.mutate()}
            disabled={rating === 0 || submit.isPending}
            className="btn-primary flex-1 py-2.5 text-sm disabled:opacity-50"
          >
            {submit.isPending ? t('common.loading') : t('reviewPrompt.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
