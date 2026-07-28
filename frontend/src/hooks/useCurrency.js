import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

// Devise en FCFA (XOF/XAF, même parité fixe avec l'EUR) — devise native de la plateforme.
const NATIVE_CURRENCY = 'FCFA';

// Correspondance code de langue navigateur (précis) -> devise
const LOCALE_CURRENCY_MAP = {
  'es-MX': 'MXN',
  'es-ES': 'EUR',
  'en-GB': 'GBP',
  'en-CA': 'CAD',
  'en-ZA': 'ZAR',
  'pt-PT': 'EUR',
  'pt-BR': 'BRL',
};

// Repli par langue de l'interface (moins précis, mais toujours disponible)
const LANG_FALLBACK_CURRENCY = {
  fr: null, // francophone Afrique par défaut — pas de conversion affichée
  en: 'USD',
  es: 'USD',
  pt: 'BRL',
};

function detectCurrency(uiLang) {
  if (typeof navigator !== 'undefined' && navigator.language) {
    const exact = LOCALE_CURRENCY_MAP[navigator.language];
    if (exact) return exact;
  }
  const base = (uiLang || 'fr').split('-')[0];
  return LANG_FALLBACK_CURRENCY[base] ?? null;
}

/**
 * Hook de conversion FCFA -> devise locale, à titre indicatif uniquement.
 * Le paiement réel reste toujours en FCFA via les moyens actuels (PayDunya, Wave, CinetPay, FedaPay, GeniusPay).
 */
export function useCurrency() {
  const { i18n } = useTranslation();
  const currency = useMemo(() => detectCurrency(i18n.language), [i18n.language]);

  const { data } = useQuery({
    queryKey: ['currency-rates'],
    queryFn: () => api.get('/currency/rates').then((r) => r.data.data),
    staleTime: 60 * 60 * 1000, // 1h — les taux ne changent qu' 1x/jour côté serveur
    enabled: !!currency,
  });

  const rate = currency && data?.rates ? data.rates[currency] : null;

  /** Convertit un montant FCFA en devise détectée. Retourne null si non disponible. */
  const convert = (amountFcfa) => {
    if (!rate || !Number.isFinite(amountFcfa)) return null;
    return amountFcfa * rate;
  };

  /** Formate le montant converti avec le symbole de la devise (ex: "23,50 €"). */
  const formatConverted = (amountFcfa) => {
    const converted = convert(amountFcfa);
    if (converted === null) return null;
    try {
      return new Intl.NumberFormat(i18n.language || 'fr-FR', {
        style: 'currency',
        currency,
        maximumFractionDigits: converted >= 100 ? 0 : 2,
      }).format(converted);
    } catch {
      return `${converted.toFixed(2)} ${currency}`;
    }
  };

  return {
    currency, // null si la devise native (FCFA) suffit
    nativeCurrency: NATIVE_CURRENCY,
    rate,
    convert,
    formatConverted,
  };
}
