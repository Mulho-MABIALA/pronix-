import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const LEAGUES = [
  { id: '61', name: 'Ligue 1 (France)' },
  { id: '140', name: 'La Liga (Espagne)' },
  { id: '39', name: 'Premier League' },
  { id: '135', name: 'Serie A' },
  { id: '78', name: 'Bundesliga' },
  { id: '2', name: 'Champions League' },
  { id: '892', name: 'Ligue Sénégalaise 1' },
  { id: '529', name: 'AFCON' },
];

export default function Onboarding() {
  const { refreshUser } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  const toggle = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.post('/profiles/me/onboarding', { favoriteLeagues: selected });
      await refreshUser();
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-surface-900 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 animate-slide-up">
        <div className="text-center">
          <span className="text-4xl" aria-hidden="true">🎯</span>
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">Personnalisez votre flux</h1>
          <p className="text-gray-400 mt-2 text-sm">Sélectionnez les compétitions qui vous intéressent</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {LEAGUES.map((league) => (
            <button
              key={league.id}
              onClick={() => toggle(league.id)}
              aria-pressed={selected.includes(league.id)}
              className={`bento-card text-left transition-all ${
                selected.includes(league.id) ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'text-gray-300 hover:border-surface-500'
              }`}
            >
              <span className="text-sm font-medium">{league.name}</span>
            </button>
          ))}
        </div>

        <button onClick={handleFinish} disabled={loading} className="btn-primary w-full">
          {loading ? 'Enregistrement…' : selected.length > 0 ? 'Commencer' : 'Passer cette étape'}
        </button>
      </div>
    </div>
  );
}
