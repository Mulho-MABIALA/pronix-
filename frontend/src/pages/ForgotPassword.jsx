import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
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
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">Mot de passe oublié</h1>
        </div>

        {sent ? (
          <div className="bento-card text-center space-y-3">
            <p className="text-primary-400">✓ Email envoyé</p>
            <p className="text-gray-400 text-sm">Si cet email existe, un lien de réinitialisation vous a été envoyé.</p>
            <Link to="/connexion" className="btn-secondary w-full">Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bento-card space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email</label>
              <input id="email" type="email" required className="input" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="vous@exemple.com" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Envoi…' : 'Envoyer le lien'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-500">
          <Link to="/connexion" className="text-primary-400 hover:underline">← Retour</Link>
        </p>
      </div>
    </div>
  );
}
