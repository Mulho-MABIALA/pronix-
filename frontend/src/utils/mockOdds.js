// Génération de cotes "bookmaker" simulées, dérivées de la probabilité interne du modèle.
// ⚠️ Ce module ne contacte aucun bookmaker réel : il s'agit de données simulées,
// déterministes (stables entre les rendus) et calculées uniquement côté client,
// dans l'attente d'une intégration future avec un flux de cotes réel.

const BOOKMAKERS = ['BookOne', 'WinSpot', 'OddsHub'];

const VALUE_THRESHOLD = 0.05; // EV >= 5% => "value bet"
const MARGIN = 0.07;          // marge bookmaker simulée (overround ~7%)
const VARIANCE_AMPLITUDE = 0.15; // dispersion +/-15% entre bookmakers simulés

// PRNG déterministe (mulberry32) seedé à partir d'une chaîne — mêmes entrées => mêmes sorties.
function seededRandom(key) {
  let h = 1779033703 ^ String(key).length;
  for (let i = 0; i < String(key).length; i++) {
    h = Math.imul(h ^ String(key).charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function clampProb(prob) {
  return Math.min(Math.max(Number(prob) || 1, 1), 99);
}

/**
 * Cote simulée d'un bookmaker donné pour une probabilité et une clé stables.
 * @param {number} prob probabilité estimée (0-100)
 * @param {string|number} key clé stable (ex: `${matchId}-1X2-HOME_WIN`)
 * @param {number} bookmakerIndex index du bookmaker simulé (0..N)
 */
export function getMockOdd(prob, key, bookmakerIndex = 0) {
  const p = clampProb(prob) / 100;
  const fairOdd = 1 / p;
  const variance = (seededRandom(`${key}::bk${bookmakerIndex}`) - 0.5) * 2 * VARIANCE_AMPLITUDE;
  const factor = (1 - MARGIN) * (1 + variance);
  const odd = fairOdd * factor;
  return Math.max(1.01, Math.round(odd * 100) / 100);
}

/** Panel des cotes simulées par bookmaker, triées de la meilleure à la moins bonne. */
export function getOddsPanel(prob, key) {
  return BOOKMAKERS
    .map((name, i) => ({ bookmaker: name, odd: getMockOdd(prob, key, i) }))
    .sort((a, b) => b.odd - a.odd);
}

/** Meilleure cote simulée disponible (comme un comparateur affichant le meilleur prix). */
export function getOdd(prob, key) {
  return getOddsPanel(prob, key)[0].odd;
}

/** EV simulée = (prob/100) * cote - 1, exprimée en fraction (0.05 = +5%). */
export function getValueEdge(prob, odd) {
  const p = clampProb(prob) / 100;
  return p * odd - 1;
}

/** Indique si la cote représente une "value bet" simulée (EV au-delà du seuil). */
export function isValueBet(prob, odd, threshold = VALUE_THRESHOLD) {
  return getValueEdge(prob, odd) >= threshold;
}

export function formatOdd(odd) {
  return Number(odd).toFixed(2);
}

export function formatEdge(edge) {
  const pct = Math.round(edge * 1000) / 10;
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`;
}

export const ODDS_DISCLAIMER = 'Cotes simulées à titre indicatif — non fournies par un bookmaker réel.';

/**
 * ROI estimé d'un tipster, dérivé de son taux de réussite réel + d'une cote moyenne
 * simulée (stable par tipster). ROI = winRate * coteMoyenne - 1.
 * Purement indicatif — ne reflète pas des gains réels.
 */
export function estimateTipsterROI(successRate, tipsterKey) {
  if (successRate == null) return null;
  const avgOdd = 1.7 + seededRandom(`roi::${tipsterKey}`) * 0.9; // cote moyenne simulée entre 1.7 et 2.6
  const roi = (successRate / 100) * avgOdd - 1;
  return Math.round(roi * 1000) / 10; // en %, 1 décimale
}
