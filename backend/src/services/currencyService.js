// Conversion FCFA (XOF) → devises étrangères — à titre indicatif uniquement.
// Le paiement réel reste toujours en FCFA via les moyens actuels (GeniusPay, Wave, PayTech, FedaPay).
//
// Le XOF est arrimé (peg) fixe à l'EUR : 1 EUR = 655.957 XOF (Trésor français / zone UEMOA).
// Pour les autres devises, on récupère les taux EUR→X via frankfurter.app (gratuit, sans clé, basé BCE),
// rafraîchis 1×/jour, avec cache en mémoire + fallback sur le dernier taux connu en cas d'échec réseau.

const XOF_PER_EUR = 655.957;

// Devises couvertes par frankfurter.app (BCE) et pertinentes pour nos marchés cibles
const TARGET_CURRENCIES = ['USD', 'GBP', 'BRL', 'MXN', 'CAD', 'ZAR'];

let cache = {
  rates: { EUR: 1 }, // taux EUR → devise
  updatedAt: null,
};

async function fetchRates() {
  const url = `https://api.frankfurter.app/latest?from=EUR&to=${TARGET_CURRENCIES.join(',')}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!res.ok) throw new Error(`frankfurter.app HTTP ${res.status}`);
  const data = await res.json();
  return data.rates || {};
}

async function refreshRates() {
  try {
    const rates = await fetchRates();
    cache = {
      rates: { EUR: 1, ...rates },
      updatedAt: new Date(),
    };
    console.log('[Currency] Taux de change actualisés:', Object.keys(cache.rates).join(', '));
  } catch (err) {
    console.warn('[Currency] Échec de rafraîchissement des taux — conservation du cache existant:', err.message);
  }
}

/** Taux XOF -> devise, dérivé du peg fixe XOF/EUR et des taux EUR->X en cache. */
function getXofRates() {
  const out = { XOF: 1 };
  for (const [code, eurRate] of Object.entries(cache.rates)) {
    // 1 XOF = (1 / XOF_PER_EUR) EUR = (eurRate / XOF_PER_EUR) devise
    out[code] = eurRate / XOF_PER_EUR;
  }
  return out;
}

/** Convertit un montant en FCFA (XOF) vers la devise cible. Retourne null si devise non supportée. */
function convertFromXof(amountXof, targetCurrency) {
  const rates = getXofRates();
  const rate = rates[targetCurrency];
  if (!rate) return null;
  return Math.round(amountXof * rate * 100) / 100;
}

function getSupportedCurrencies() {
  return ['XOF', 'EUR', ...TARGET_CURRENCIES];
}

function getCacheInfo() {
  return { updatedAt: cache.updatedAt, currencies: getSupportedCurrencies() };
}

module.exports = {
  refreshRates,
  getXofRates,
  convertFromXof,
  getSupportedCurrencies,
  getCacheInfo,
};
