import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../services/api';
import { usePageMeta } from '../hooks/usePageMeta';

export default function VerifyEmail() {
  const { t } = useTranslation();
  usePageMeta(t('auth.verifyEmailMetaTitle'));
  const [params] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMessage(t('auth.missingToken')); return; }

    api.get(`/auth/verify-email/${token}`)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setMessage(err.response?.data?.message || t('auth.invalidOrExpiredLinkDot'));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bento-card max-w-sm w-full text-center py-10 space-y-4">
        {status === 'loading' && (
          <>
            <Loader size={40} className="text-primary-400 animate-spin mx-auto" />
            <p className="text-gray-400">{t('auth.verifying')}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={40} className="text-primary-400 mx-auto" />
            <h1 className="text-xl font-bold text-gray-100">{t('auth.emailVerified')}</h1>
            <p className="text-gray-500 text-sm">{t('auth.emailVerifiedDesc')}</p>
            <Link to="/" className="btn-cta inline-flex mt-2">{t('auth.homeArrow')}</Link>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle size={40} className="text-red-400 mx-auto" />
            <h1 className="text-xl font-bold text-gray-100">{t('auth.invalidLink')}</h1>
            <p className="text-gray-500 text-sm">{message}</p>
            <Link to="/" className="btn-secondary inline-flex mt-2">{t('comboDetail.back')}</Link>
          </>
        )}
      </div>
    </div>
  );
}
