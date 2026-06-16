import { useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const token = params.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      navigate('/connexion?reset=1');
    } catch (err) {
      setError(err.response?.data?.message || 'Lien invalide ou expiré');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return <div className="text-center py-20 text-gray-500">Lien invalide</div>;

  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6 animate-slide-up">
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-gray-100">Nouveau mot de passe</h1>
        </div>
        <form onSubmit={handleSubmit} className="bento-card space-y-4">
          {error && <div role="alert" className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Nouveau mot de passe</label>
            <input id="password" type="password" required className="input" minLength={8}
              value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-sm font-medium text-gray-300 mb-1.5">Confirmer</label>
            <input id="confirm" type="password" required className="input"
              value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Enregistrement…' : 'Réinitialiser'}
          </button>
        </form>
      </div>
    </div>
  );
}
