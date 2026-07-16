import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../services/api';
import { usePageMeta } from '../hooks/usePageMeta';

export default function VerifyEmail() {
  usePageMeta('Vérification email — fpronix');
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage('Token manquant.'); return; }

    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'Lien invalide ou expiré.');
      });
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bento-card max-w-sm w-full text-center py-10 space-y-4">
        {status === 'loading' && (
          <>
            <Loader size={40} className="text-primary-400 animate-spin mx-auto" />
            <p className="text-gray-400">Vérification en cours...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="text-primary-400 mx-auto" />
            <h1 className="text-xl font-bold text-gray-100">Email vérifié !</h1>
            <p className="text-gray-500 text-sm">Ton adresse email a été confirmée avec succès.</p>
            <Link to="/" className="btn-cta inline-flex mt-2">Accueil →</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-gray-100">Lien invalide</h1>
            <p className="text-gray-500 text-sm">{message}</p>
            <Link to="/" className="btn-secondary inline-flex mt-2">Retour</Link>
          </>
        )}
      </div>
    </div>
  );
}
