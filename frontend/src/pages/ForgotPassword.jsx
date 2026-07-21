import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        <div className="text-center">
          <span className="text-4xl" aria-hidden="true">🔑</span>
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">{t('auth.forgotPasswordTitle')}</h1>
        </div>

        {sent ? (
          <div className="bento-card text-center space-y-3">
            <p className="text-primary-400">✓ {t('auth.emailSent')}</p>
            <p className="text-gray-400 text-sm">{t('auth.resetLinkSentDesc')}</p>
            <Link to="/connexion" className="btn-secondary w-full">{t('auth.backToLogin')}</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bento-card space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">{t('auth.email')}</label>
              <input id="email" type="email" required className="input" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? t('auth.sending') : t('auth.sendLink')}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link to="/connexion" className="text-primary-400 hover:underline">← {t('comboDetail.back')}</Link>
        </p>
      </div>
    </div>
  );
}
