import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { hapticImpact } from '../utils/haptics';

const MAX_ATTEMPTS = 12;  // 12 × 2s = 24 secondes max
const POLL_INTERVAL = 2000;

export default function PaymentConfirmation({ error: isErrorPage = false }) {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState(isErrorPage ? 'error' : 'loading');
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);

  const ref = params.get('ref');
  const mock = params.get('mock');
  const isTipsterFlow = params.get('type') === 'tipster';
  const tipsterId = params.get('tipsterId');

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      if (cancelled) return;
      attemptsRef.current += 1;

      try {
        const { data } = await api.get(`/payments/verify?ref=${ref}&mock=${mock || '0'}`);

        if (data.data?.confirmed) {
          await refreshUser();
          if (!cancelled) setStatus('success');
          return;
        }
      } catch {
        // réseau — on réessaie
      }

      if (attemptsRef.current >= MAX_ATTEMPTS) {
        if (!cancelled) setStatus('timeout');
        return;
      }

      timerRef.current = setTimeout(poll, POLL_INTERVAL);
    }

    if (isErrorPage) return; // page erreur — pas de polling

    if (ref) {
      poll();
    } else {
      // Pas de ref (accès direct) → success générique
      refreshUser().then(() => setStatus('success'));
    }

    return () => {
      cancelled = true;
      clearTimeout(timerRef.current);
    };
  }, [ref, mock, refreshUser]);

  // Moment fort — paiement confirmé, un seul déclenchement par arrivée à 'success'.
  useEffect(() => {
    if (status === 'success') hapticImpact();
  }, [status]);

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader size={40} className="text-primary-400 animate-spin mx-auto" />
          <p className="text-ink-4 font-medium">{t('paymentConfirm.verifying')}</p>
          <p className="text-ink-4 text-sm">{t('paymentConfirm.mayTakeSeconds')}</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="bento-card max-w-sm w-full text-center space-y-4 py-10">
          <XCircle size={48} className="text-red-400 mx-auto" />
          <h1 className="font-display font-bold text-2xl text-ink-1">{t('paymentConfirm.cancelledTitle')}</h1>
          <p className="text-ink-4 text-sm">
            {t('paymentConfirm.cancelledDesc')}
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Link to={isTipsterFlow && tipsterId ? `/tipsters/${tipsterId}` : '/abonnement'} className="btn-primary">
              {t('paymentConfirm.retry')}
            </Link>
            <Link to="/" className="btn-secondary">{t('errors.backHome')}</Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="bento-card max-w-sm w-full text-center space-y-4 py-10">
          <XCircle size={48} className="text-amber-400 mx-auto" />
          <h1 className="font-display font-bold text-2xl text-ink-1">{t('paymentConfirm.pendingTitle')}</h1>
          <p className="text-ink-4 text-sm">
            {t('paymentConfirm.pendingDesc')}
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Link to="/profil" className="btn-primary">{t('paymentConfirm.checkSubscription')}</Link>
            <Link to="/" className="btn-secondary">{t('errors.backHome')}</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="bento-card max-w-sm w-full text-center space-y-4 py-10">
        <CheckCircle size={48} className="text-primary-400 mx-auto" aria-hidden="true" />
        <h1 className="font-display font-bold text-2xl text-ink-1">
          {isTipsterFlow ? t('paymentConfirm.tipsterConfirmedTitle') : t('paymentConfirm.confirmedTitle')}
        </h1>
        <p className="text-ink-4">
          {isTipsterFlow ? t('paymentConfirm.tipsterConfirmedDesc') : t('paymentConfirm.confirmedDesc')}
        </p>
        {mock === '1' && (
          <p className="text-xs text-ink-4">{t('paymentConfirm.simulationRef', { ref })}</p>
        )}
        <div className="flex flex-col gap-2 pt-4">
          {isTipsterFlow && tipsterId ? (
            <Link to={`/tipsters/${tipsterId}`} className="btn-primary">{t('paymentConfirm.viewTipsterProfile')}</Link>
          ) : (
            <Link to="/matchs" className="btn-primary">{t('paymentConfirm.exploreMatches')}</Link>
          )}
          <Link to="/profil" className="btn-secondary">{t('profile.subscription')}</Link>
        </div>
      </div>
    </div>
  );
}
