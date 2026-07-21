import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const LEAGUE_IDS = ['61', '140', '39', '135', '78', '2', '892', '529'];

export default function Onboarding() {
  const { t } = useTranslation();
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
          <h1 className="font-display font-bold text-2xl text-gray-100 mt-2">{t('onboarding.title')}</h1>
          <p className="text-gray-400 mt-2 text-sm">{t('onboarding.subtitle')}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {LEAGUE_IDS.map((id) => (
            <button
              key={id}
              onClick={() => toggle(id)}
              aria-pressed={selected.includes(id)}
              className={`bento-card text-left transition-all ${
                selected.includes(id) ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'text-gray-300 hover:border-surface-500'
              }`}
            >
              <span className="text-sm font-medium">{t(`onboarding.leagues.${id}`)}</span>
            </button>
          ))}
        </div>

        <button onClick={handleFinish} disabled={loading} className="btn-primary w-full">
          {loading ? t('profile.saving') : selected.length > 0 ? t('onboarding.start') : t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}
