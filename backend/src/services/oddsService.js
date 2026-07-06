// The Odds API — https://the-odds-api.com
// Plan gratuit : 500 req/mois.
// Stratégie : sync 1×/jour via cron, cache in-memory, fallback mock côté front si absent.

const env = require('../config/env');

// Championnats couverts (clés The Odds API) — adapter selon les ligues de ta base
const SOCCER_SPORTS = [
  'soccer_epl',
  'soccer_france_ligue1',
  'soccer_spain_la_liga',
  'soccer_italy_serie_a',
  'soccer_germany_bundesliga1',
  'soccer_uefa_champs_league',
  'soccer_uefa_europa_league',
  'soccer_africa_cup_of_nations',
  'soccer_conmebol_copa_libertadores',
  'soccer_usa_mls',
];

// Cache in-memory : key → données de cotes
const oddsCache = new Map();
let lastSync = null;
let requestsRemaining = null;

// ── Normalisation des noms d'équipes pour la correspondance ──────────────────
function normalizeName(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // accents
    .replace(/[^a-z0-9]/g, '');        // tout sauf alphanum
}

function buildKey(homeTeam, awayTeam, dateStr) {
  return `${normalizeName(homeTeam)}|${normalizeName(awayTeam)}|${dateStr}`;
}

// ── Appel API pour un sport ───────────────────────────────────────────────────
async function fetchSportOdds(sportKey) {
  if (!env.ODDS_API_KEY) return [];

  const url =
    `https://api.the-odds-api.com/v4/sports/${sportKey}/odds/` +
    `?apiKey=${env.ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;

  let res;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(12000) });
  } catch (err) {
    console.warn(`[Odds] Timeout/réseau pour ${sportKey}:`, err.message);
    return [];
  }

  const remaining = res.headers.get('x-requests-remaining');
  if (remaining !== null) {
    requestsRemaining = parseInt(remaining, 10);
    console.log(`[Odds] Requêtes restantes: ${requestsRemaining}`);
  }

  if (res.status === 401) { console.error('[Odds] Clé API invalide'); return []; }
  if (res.status === 422) { console.warn(`[Odds] Sport inconnu: ${sportKey}`); return []; }
  if (res.status === 429) { console.warn('[Odds] Quota épuisé'); return []; }
  if (!res.ok)            { console.warn(`[Odds] HTTP ${res.status} pour ${sportKey}`); return []; }

  return res.json();
}

// ── Traitement d'un événement → structure normalisée ─────────────────────────
function processEvent(event) {
  const books = [];

  for (const bk of (event.bookmakers || [])) {
    const market = bk.markets?.find((m) => m.key === 'h2h');
    if (!market) continue;

    const homeOdd = market.outcomes.find((o) => o.name === event.home_team)?.price;
    const awayOdd = market.outcomes.find((o) => o.name === event.away_team)?.price;
    const drawOdd = market.outcomes.find((o) => o.name === 'Draw')?.price;

    if (homeOdd && awayOdd && drawOdd) {
      books.push({ bookmaker: bk.title, home: homeOdd, draw: drawOdd, away: awayOdd });
    }
  }

  if (books.length === 0) return null;

  // Meilleure cote par issue (best odds comparator)
  const best = {
    home: Math.max(...books.map((b) => b.home)),
    draw: Math.max(...books.map((b) => b.draw)),
    away: Math.max(...books.map((b) => b.away)),
  };

  return {
    homeTeam:     event.home_team,
    awayTeam:     event.away_team,
    commenceTime: event.commence_time,
    bookmakers:   books.slice(0, 5),
    best,
    updatedAt:    new Date().toISOString(),
  };
}

// ── Synchronisation principale (appelée par le cron) ─────────────────────────
async function syncOdds() {
  if (!env.ODDS_API_KEY) {
    console.log('[Odds] ODDS_API_KEY absente — sync ignorée');
    return;
  }

  console.log('[Odds] Synchronisation des cotes...');
  let total = 0;

  for (const sport of SOCCER_SPORTS) {
    try {
      const events = await fetchSportOdds(sport);

      for (const event of events) {
        const data = processEvent(event);
        if (!data) continue;

        const d = new Date(event.commence_time);
        const dateStr = d.toISOString().split('T')[0];
        const key = buildKey(event.home_team, event.away_team, dateStr);
        oddsCache.set(key, data);
        total++;
      }

      // Pause polie entre requêtes
      await new Promise((r) => setTimeout(r, 600));
    } catch (err) {
      console.error(`[Odds] Erreur sync ${sport}:`, err.message);
    }
  }

  lastSync = new Date();
  console.log(`[Odds] ${total} matchs en cache, sync terminée (${lastSync.toISOString()})`);
}

// ── Récupération des cotes pour un match ─────────────────────────────────────
function getOddsForMatch(homeTeam, awayTeam, scheduledAt) {
  const d    = new Date(scheduledAt);
  const date = d.toISOString().split('T')[0];

  // 1. Clé exacte
  const exactKey = buildKey(homeTeam, awayTeam, date);
  if (oddsCache.has(exactKey)) return oddsCache.get(exactKey);

  // 2. Décalage ±1 jour (timezone)
  for (const delta of [-1, 1]) {
    const tmp = new Date(d);
    tmp.setDate(tmp.getDate() + delta);
    const k = buildKey(homeTeam, awayTeam, tmp.toISOString().split('T')[0]);
    if (oddsCache.has(k)) return oddsCache.get(k);
  }

  // 3. Correspondance partielle sur les noms (ex: "PSG" vs "Paris Saint-Germain")
  const nh = normalizeName(homeTeam);
  const na = normalizeName(awayTeam);

  for (const data of oddsCache.values()) {
    const dh = normalizeName(data.homeTeam);
    const da = normalizeName(data.awayTeam);

    const homeMatch = dh.includes(nh) || nh.includes(dh);
    const awayMatch = da.includes(na) || na.includes(da);

    if (homeMatch && awayMatch) {
      const diff = Math.abs(new Date(data.commenceTime) - d);
      if (diff < 2 * 24 * 60 * 60 * 1000) return data;
    }
  }

  return null;
}

function getStatus() {
  return {
    configured:        !!env.ODDS_API_KEY,
    lastSync,
    cacheSize:         oddsCache.size,
    requestsRemaining,
  };
}

module.exports = { syncOdds, getOddsForMatch, getStatus };
