import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff, Fingerprint } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hapticSuccess, hapticError } from '../utils/haptics';

export default function Login() {
  const { t } = useTranslation();
  const { login, loginWithGoogle, loginWithPasskey } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passkeySupported, setPasskeySupported] = useState(false);
  const [passkeyLoading, setPasskeyLoading] = useState(false);

  useEffect(() => {
    import('@simplewebauthn/browser').then(({ browserSupportsWebAuthn }) => {
      setPasskeySupported(browserSupportsWebAuthn());
    }).catch(() => {});
  }, []);

  const handlePasskeyLogin = async () => {
    setError('');
    setPasskeyLoading(true);
    try {
      const user = await loginWithPasskey();
      hapticSuccess();
      navigate(user.profile?.onboardingDone === false ? '/onboarding' : '/');
    } catch (err) {
      // L'utilisateur annule lui-même (bouton "Annuler" du prompt Face ID/empreinte)
      // → pas d'erreur affichée, ce n'est pas un échec.
      if (err?.name !== 'NotAllowedError') {
        hapticError();
        setError(err.response?.data?.message || t('auth.passkeyError'));
      }
    } finally {
      setPasskeyLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle(credential);
      navigate(user.profile?.onboardingDone === false ? '/onboarding' : '/');
    } catch (err) {
      if (err.response?.data?.code === 'AGE_CONFIRMATION_REQUIRED') {
        setError(t('auth.ageConfirmOnRegister'));
      } else {
        setError(err.response?.data?.message || t('errors.serverError'));
      }
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
          <img src="/logo-circle.png" alt="fpronix" className="w-16 h-16 mx-auto rounded-full" />
          <h1 className="font-display font-bold text-2xl text-ink-1 mt-2">{t('auth.loginTitle')}</h1>
          <p className="text-ink-3 text-sm mt-1">{t('auth.loginSubtitle')}</p>
        </div>

        {passkeySupported && (
          <>
            <button
              type="button"
              onClick={handlePasskeyLogin}
              disabled={passkeyLoading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-primary-500/30 bg-primary-500/10 text-primary-300 font-semibold text-sm hover:bg-primary-500/15 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Fingerprint size={18} />
              {passkeyLoading ? '…' : t('auth.passkeyLoginCta')}
            </button>
            <div className="relative flex items-center gap-3">
              <div className="flex-grow border-t border-surface-600" />
              <span className="text-xs text-ink-3 shrink-0">{t('common.or')}</span>
              <div className="flex-grow border-t border-surface-600" />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit} className="bento-card space-y-4" noValidate>
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-ink-3 mb-1.5">
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
            <label htmlFor="password" className="block text-sm font-medium text-ink-3 mb-1.5">
              {t('auth.password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                className="input pr-11"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
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
          <span className="text-xs text-ink-3 shrink-0">{t('common.or')}</span>
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

        <p className="text-center text-sm text-ink-3">
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
