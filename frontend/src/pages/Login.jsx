import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate(user.profile?.onboardingDone === false ? '/onboarding' : '/');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur de connexion');
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
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">Connexion</h1>
          <p className="text-gray-500 text-sm mt-1">Bienvenue sur Pronix</p>
        </div>

        <form onSubmit={handleSubmit} className="bento-card space-y-4" noValidate>
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
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
              Mot de passe
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
                Mot de passe oublié ?
              </Link>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Pas encore de compte ?{' '}
          <Link to="/inscription" className="text-primary-400 hover:underline font-medium">
            S'inscrire gratuitement
          </Link>
        </p>

        <p className="disclaimer text-center">
          En vous connectant, vous acceptez nos{' '}
          <Link to="/cgu" className="underline">CGU</Link>.{' '}
          Ceci n'est pas un conseil financier.
        </p>
      </div>
    </div>
  );
}
