import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const MAX_ATTEMPTS = 12;  // 12 × 2s = 24 secondes max
const POLL_INTERVAL = 2000;

export default function PaymentConfirmation() {
  const [params] = useSearchParams();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState('loading'); // loading | success | timeout | error
  const attemptsRef = useRef(0);
  const timerRef = useRef(null);

  const ref = params.get('ref');
  const mock = params.get('mock');

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

  if (status === 'loading') {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader size={40} className="text-primary-400 animate-spin mx-auto" />
          <p className="text-gray-400 font-medium">Vérification du paiement…</p>
          <p className="text-gray-600 text-sm">Cela peut prendre quelques secondes</p>
        </div>
      </div>
    );
  }

  if (status === 'timeout') {
    return (
      <div className="min-h-dvh flex items-center justify-center px-4">
        <div className="bento-card max-w-sm w-full text-center space-y-4 py-10">
          <XCircle size={48} className="text-yellow-400 mx-auto" />
          <h1 className="font-display font-bold text-2xl text-gray-100">Paiement en cours…</h1>
          <p className="text-gray-400 text-sm">
            Votre paiement est en cours de traitement. Si votre abonnement n'est pas actif dans quelques minutes, contactez le support.
          </p>
          <div className="flex flex-col gap-2 pt-4">
            <Link to="/profil" className="btn-primary">Vérifier mon abonnement</Link>
            <Link to="/" className="btn-secondary">Retour à l'accueil</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="bento-card max-w-sm w-full text-center space-y-4 py-10">
        <CheckCircle size={48} className="text-primary-400 mx-auto" aria-hidden="true" />
        <h1 className="font-display font-bold text-2xl text-gray-100">Paiement confirmé !</h1>
        <p className="text-gray-400">Votre abonnement est maintenant actif. Profitez de l'accès complet.</p>
        {mock === '1' && (
          <p className="text-xs text-gray-600">(Simulation — réf. {ref})</p>
        )}
        <div className="flex flex-col gap-2 pt-4">
          <Link to="/matchs" className="btn-primary">Explorer les matchs</Link>
          <Link to="/profil" className="btn-secondary">Mon abonnement</Link>
        </div>
      </div>
    </div>
  );
}
