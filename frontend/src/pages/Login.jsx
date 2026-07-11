import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle(credential);
      navigate(user.profile?.onboardingDone === false ? '/onboarding' : '/');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.profile?.onboardingDone === false ? '/onboarding' : '/');
    } catch (err) {
      setError(err.response?.data?.message || t('errors.serverError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        {/* Logo */}
        <div className="text-center">
          <span className="text-4xl" aria-hidden="true">⚽</span>
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">{t('auth.loginTitle')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="bento-card space-y-4" noValidate>
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              {t('auth.email')}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              {t('auth.password')}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
            />
            <div className="mt-1 text-right">
              <Link to="/mot-de-passe-oublie" className="text-xs text-primary-400 hover:underline">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? '…' : t('auth.loginCta')}
          </button>
        </form>

        {/* Séparateur */}
        <div className="relative flex items-center gap-3">
          <div className="flex-grow border-t border-surface-600" />
          <span className="text-xs text-gray-500 shrink-0">{t('common.or')}</span>
          <div className="flex-grow border-t border-surface-600" />
        </div>

        {/* Connexion Google */}
        <div className="flex justify-center">
          <GoogleLogin
            onSuccess={(res) => handleGoogleSuccess(res.credential)}
            onError={() => setError(t('errors.serverError'))}
            theme="filled_black"
            shape="rectangular"
            text="continue_with"
            locale="fr"
            width="320"
          />
        </div>

        <p className="text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <Link to="/inscription" className="text-primary-400 hover:underline font-medium">
            {t('auth.registerLinkFree')}
          </Link>
        </p>

        <p className="disclaimer text-center">
          {t('auth.terms')}{' '}
          <Link to="/cgu" className="underline">{t('auth.termsLink')}</Link>.{' '}
          Ceci n'est pas un conseil financier.
        </p>
      </div>
    </div>
  );
}
