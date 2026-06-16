import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    setLoading(true);
    try {
      await register(form.email, form.password, form.username);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        <div className="text-center">
          <span className="text-4xl" aria-hidden="true">⚽</span>
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">Créer un compte</h1>
          <p className="text-gray-500 text-sm mt-1">Gratuit, sans engagement</p>
        </div>

        <form onSubmit={handleSubmit} className="bento-card space-y-4" noValidate>
          {error && (
            <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-1.5">Pseudo</label>
            <input id="username" type="text" autoComplete="username" required className="input"
              value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="MonPseudo" pattern="^[a-zA-Z0-9_]+$" />
            <p className="text-xs text-gray-500 mt-1">Lettres, chiffres et _ uniquement</p>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
            <input id="reg-email" type="email" autoComplete="email" required className="input"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="vous@exemple.com" />
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-300 mb-1.5">Mot de passe</label>
            <input id="reg-password" type="password" autoComplete="new-password" required className="input"
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 8 car., 1 majuscule, 1 chiffre" minLength={8} />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirmer le mot de passe</label>
            <input id="confirm" type="password" autoComplete="new-password" required className="input"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="••••••••" />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Création…' : 'Créer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Déjà un compte ?{' '}
          <Link to="/connexion" className="text-primary-400 hover:underline font-medium">Se connecter</Link>
        </p>

        <p className="disclaimer text-center">
          En vous inscrivant, vous acceptez nos <Link to="/cgu" className="underline">CGU</Link>.
          Plateforme réservée aux 18+. Ceci n'est pas un conseil financier.
        </p>
      </div>
    </div>
  );
}
