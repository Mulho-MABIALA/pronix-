import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Zap, Search, Check } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../hooks/useCurrency';
import CompetitionLogo from '../components/ui/CompetitionLogo';
import { COUNTRIES } from '../data/countries';

const LANGUAGE_OPTIONS = [
  { code: 'fr', label: '🇫🇷 Français' },
  { code: 'en', label: '🇬🇧 English' },
  { code: 'es', label: '🇪🇸 Español' },
  { code: 'pt', label: '🇵🇹 Português' },
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
  const [leagueSearch, setLeagueSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const detectedLang = (i18n.language || 'fr').split('-')[0];
  const [language, setLanguage] = useState(SUPPORTED_LANGS.includes(detectedLang) ? detectedLang : 'fr');
  const [currency, setCurrency] = useState(detectedCurrency || 'FCFA');
  const [country, setCountry] = useState('');

  // Exemple concret : un vrai pronostic généré aujourd'hui, pour montrer tout
  // de suite ce que fpronix produit (au lieu de juste demander de choisir des ligues).
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: exampleData, isLoading: exampleLoading } = useQuery({
    queryKey: ['onboarding-example', today],
    queryFn: () => api.get(`/matches?date=${today}&limit=50`).then((r) => r.data),
  });
  const examplePicks = useMemo(() => {
    const all = exampleData?.data || [];
    return all
      .filter((m) => m.predictions?.bestPick)
      .sort((a, b) => (b.predictions.bestPick.prob || 0) - (a.predictions.bestPick.prob || 0))
      .slice(0, 3);
  }, [exampleData]);

  // Liste complète des championnats (avec logos) — mêmes données que Machine.jsx,
  // au lieu d'une sélection figée de 8 ligues qui ne couvrait pas tout.
  const { data: competitionsData, isLoading: competitionsLoading } = useQuery({
    queryKey: ['onboarding-competitions'],
    queryFn: () => api.get('/matches/competitions').then((r) => r.data),
    staleTime: Infinity,
  });
  const competitions = competitionsData?.data || [];
  const filteredCompetitions = useMemo(() => {
    const q = leagueSearch.trim().toLowerCase();
    if (!q) return competitions;
    return competitions.filter((c) =>
      c.name?.toLowerCase().includes(q) || c.country?.toLowerCase().includes(q)
    );
  }, [competitions, leagueSearch]);

  const toggle = (id) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await api.post('/profiles/me/onboarding', { favoriteLeagues: selected, language, currency, ...(country && { country }) });
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
          <h1 className="font-display font-bold text-2xl text-ink-1 mt-2">{t('onboarding.title')}</h1>
          <p className="text-ink-4 mt-2 text-sm">{t('onboarding.subtitle')}</p>
        </div>

        {/* Exemple concret — ce que fpronix génère vraiment */}
        {(exampleLoading || examplePicks.length > 0) && (
          <div className="bento-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Zap size={15} className="text-orange-400 shrink-0" />
              <p className="text-sm font-bold text-ink-1">{t('onboarding.exampleTitle')}</p>
            </div>
            <p className="text-xs text-ink-4 -mt-1">{t('onboarding.exampleDesc')}</p>
            {exampleLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-11 rounded-lg bg-overlay/[0.04] animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {examplePicks.map((m) => {
                  const pick = m.predictions.bestPick;
                  const pickLabel = t(`pronostics.pickShort.${pick.type}`, { defaultValue: pick.label });
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-overlay/[0.03] border border-overlay/[0.06]"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink-2 truncate">
                          {m.homeTeam} – {m.awayTeam}
                        </p>
                        <p className="text-[11px] text-ink-4 truncate">
                          {pick.market ? `${pick.market} · ` : ''}{pickLabel}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-primary-400 shrink-0">{pick.prob}%</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-sm font-semibold text-ink-1">{t('onboarding.leaguesLabel')}</p>
          <p className="text-xs text-ink-4 mt-0.5 mb-3">{t('onboarding.leaguesHint')}</p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-4 pointer-events-none" />
          <input
            type="text"
            value={leagueSearch}
            onChange={(e) => setLeagueSearch(e.target.value)}
            placeholder={t('onboarding.leaguesSearchPlaceholder')}
            className="input pl-9 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 -mt-1">
          {competitionsLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg bg-overlay/[0.04] animate-pulse" />
            ))
          ) : filteredCompetitions.length === 0 ? (
            <p className="text-xs text-ink-4 text-center py-4">{t('onboarding.leaguesNoResults')}</p>
          ) : (
            filteredCompetitions.map((c) => {
              const id = String(c.externalId);
              const isActive = selected.includes(id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggle(id)}
                  aria-pressed={isActive}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border text-left transition-colors ${
                    isActive ? 'border-primary-500 bg-primary-500/10 text-primary-300' : 'border-overlay/[0.07] text-ink-3 hover:border-surface-500'
                  }`}
                >
                  <CompetitionLogo logo={c.logo} size={20} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{c.name}</span>
                    <span className="block text-[11px] text-ink-4 truncate">{c.country}</span>
                  </span>
                  {isActive && <Check size={14} className="text-primary-400 shrink-0" />}
                </button>
              );
            })
          )}
        </div>

        <p className="text-sm font-semibold text-ink-1 -mb-1">{t('onboarding.preferencesLabel')}</p>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="onb-language" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.languagePreference')}</label>
            <select id="onb-language" className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGE_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="onb-currency" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.currencyPreference')}</label>
            <select id="onb-currency" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
              {CURRENCY_OPTIONS.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="text-xs text-ink-3 -mt-2">{t('auth.currencyPreferenceHint')}</p>

        <div>
          <label htmlFor="onb-country" className="block text-sm font-medium text-ink-3 mb-1.5">{t('auth.countryPreference')}</label>
          <select id="onb-country" className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
            <option value="">{t('auth.countryPreferencePlaceholder')}</option>
            {COUNTRIES.map(({ code, flag, label }) => (
              <option key={code} value={code}>{flag} {label}</option>
            ))}
          </select>
        </div>

        <button onClick={handleFinish} disabled={loading} className="btn-primary w-full">
          {loading ? t('profile.saving') : t('onboarding.start')}
        </button>
      </div>
    </div>
  );
}
