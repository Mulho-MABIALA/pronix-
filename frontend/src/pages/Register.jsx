import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// Extrait le message le plus utile d'une erreur API : priorité au premier
// message de validation par champ (ex: "Le mot de passe doit contenir une
// majuscule") plutôt qu'au message générique "Données invalides".
function extractErrorMessage(err, fallback) {
  const fieldErrors = err.response?.data?.errors;
  if (fieldErrors) {
    const firstField = Object.keys(fieldErrors)[0];
    const firstMsg = firstField && fieldErrors[firstField]?.[0];
    if (firstMsg) return firstMsg;
  }
  return err.response?.data?.message || fallback;
}

export default function Register() {
  const { t } = useTranslation();
  const { register, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref');
  const partnerCode = searchParams.get('partner');
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Enregistre le parrainage/partenariat après inscription — best-effort, jamais
  // bloquant (code invalide, déjà attribué etc. sont silencieusement ignorés).
  const registerReferralIfAny = () => {
    if (refCode) api.post(`/referrals/use/${encodeURIComponent(refCode)}`).catch(() => {});
    if (partnerCode) api.post(`/partners/use/${encodeURIComponent(partnerCode)}`).catch(() => {});
  };

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      const user = await loginWithGoogle(credential, ageConfirmed);
      const isNewAccount = user.profile?.onboardingDone === false;
      if (isNewAccount) registerReferralIfAny();
      navigate(isNewAccount ? '/onboarding' : '/');
    } catch (err) {
      setError(extractErrorMessage(err, t('errors.serverError')));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (!ageConfirmed) {
      setError(t('auth.ageConfirmRequired'));
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username, undefined, undefined, ageConfirmed);
      registerReferralIfAny();
      navigate('/onboarding');
    } catch (err) {
      setError(extractErrorMessage(err, t('errors.serverError')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        <div className="text-center">
          <img src="/logo-circle.png" alt="fpronix" className="w-16 h-16 mx-auto rounded-full" />
          <h1 className="font-display font-bold text-2xl text-ink-1 mt-2">{t('auth.registerTitle')}</h1>
          <p className="text-ink-3 text-sm mt-1">{t('auth.freeNoCommit')}</p>
        </div>

        {refCode && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm">
            <Gift size={16} className="shrink-0" />
            {t('auth.referralInviteBanner')}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bento-card space-y-4" noValidate>
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.usernameLabel')}</label>
            <input id="username" type="text" autoComplete="username" required className="input"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="MonPseudo" minLength={3} maxLength={30} />
            <p className="text-xs text-ink-3 mt-1">{t('auth.usernameHint')}</p>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.email')}</label>
            <input id="reg-email" type="email" autoComplete="email" required className="input"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com" />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.password')}</label>
            <input id="reg-password" type="password" autoComplete="new-password" required className="input"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••" minLength={8}
              pattern="(?=.*[A-Z])(?=.*[0-9]).{8,}"
              title={t('auth.passwordHint')} />
            <p className="text-xs text-ink-3 mt-1">{t('auth.passwordHint')}</p>
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.confirmPassword')}</label>
            <input id="confirm" type="password" autoComplete="new-password" required className="input"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="••••••••" />
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={ageConfirmed}
              onChange={(e) => setAgeConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-overlay/[0.2] accent-primary-500 shrink-0"
            />
            <span className="text-xs text-ink-3 leading-relaxed">{t('auth.ageConfirmLabel')}</span>
          </label>

          <button type="submit" disabled={loading || !ageConfirmed} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? '…' : t('auth.registerCta')}
          </button>
        </form>

        {/* Séparateur */}
        <div className="relative flex items-center gap-3">
          <div className="flex-grow border-t border-surface-600" />
          <span className="text-xs text-ink-3 shrink-0">{t('common.or')}</span>
          <div className="flex-grow border-t border-surface-600" />
        </div>

        {/* Inscription Google — n'apparaît qu'après confirmation de l'âge (18+) */}
        <div className="flex justify-center">
          {ageConfirmed ? (
            <GoogleLogin
              onSuccess={(res) => handleGoogleSuccess(res.credential)}
              onError={() => setError(t('errors.serverError'))}
              theme="filled_black"
              shape="rectangular"
              text="signup_with"
              locale="fr"
              width="320"
            />
          ) : (
            <button
              type="button"
              onClick={() => setError(t('auth.ageConfirmRequired'))}
              className="w-[320px] max-w-full py-2.5 rounded-xl border border-overlay/[0.1] text-ink-4 text-sm font-medium opacity-60 cursor-not-allowed"
            >
              {t('auth.googleLogin')}
            </button>
          )}
        </div>

        <p className="text-center text-sm text-ink-3">
          {t('auth.hasAccount')}{' '}
          <Link to="/connexion" className="text-primary-400 hover:underline font-medium">{t('auth.loginLink')}</Link>
        </p>

        <p className="disclaimer text-center">
          {t('auth.termsReg')} <Link to="/cgu" className="underline">{t('auth.termsLink')}</Link>.{' '}
          {t('auth.disclaimer18')}
        </p>
      </div>
    </div>
  );
}
