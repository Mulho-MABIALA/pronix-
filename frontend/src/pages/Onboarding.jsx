import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';

const LEAGUE_IDS = ['61', '140', '39', '135', '78', '2', '892', '529'];

const LANGUAGE_OPTIONS = [
  { code: 'fr', label: 'Français' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'pt', label: 'Português' },
];

const CURRENCY_OPTIONS = [
  { code: 'FCFA', label: 'FCFA' },
  { code: 'EUR', label: 'EUR (€)' },
  { code: 'USD', label: 'USD ($)' },
  { code: 'GBP', label: 'GBP (£)' },
  { code: 'BRL', label: 'BRL (R$)' },
  { code: 'MXN', label: 'MXN ($)' },
  { code: 'CAD', label: 'CAD ($)' },
  { code: 'ZAR', label: 'ZAR (R)' },
];

const SUPPORTED_LANGS = ['fr', 'en', 'es', 'pt'];

export default function Onboarding() {
  const { t, i18n } = useTranslation();
  const { refreshUser } = useAuth();
  const { currency: detectedCurrency } = useCurrency();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const detectedLang = (i18n.language || 'fr').split('-')[0];
  const [language, setLanguage] = useState(SUPPORTED_LANGS.includes(detectedLang) ? detectedLang : 'fr');
  const [currency, setCurrency] = useState(detectedCurrency || 'FCFA');

  const toggle = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.post('/profiles/me/onboarding', { favoriteLeagues: selected, language, currency });
      i18n.changeLanguage(language);
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

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-language" className="block text-sm font-medium text-gray-300 mb-1.5">{t('auth.languagePreference')}</label>
            <select id="onb-language" className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="onb-currency" className="block text-sm font-medium text-gray-300 mb-1.5">{t('auth.currencyPreference')}</label>
            <select id="onb-currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCY_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-gray-300 -mt-2">{t('auth.currencyPreferenceHint')}</p>

        <button onClick={handleFinish} disabled={loading} className="btn-primary w-full">
          {loading ? t('profile.saving') : selected.length > 0 ? t('onboarding.start') : t('onboarding.skip')}
        </button>
      </div>
    </div>
  );
}
