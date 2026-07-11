/**
 * Service de contexte footballistique — agrège les données temps réel pour l'IA
 * ─────────────────────────────────────────────────────────────────────────────
 * Sources : API-Football via footballApi.js
 * Cache   : mémoire avec TTL pour respecter le quota 100 req/jour (plan gratuit)
 *
 * Stratégie de cache :
 *  - Forme récente   → 6h  (une équipe ne joue pas 2× par jour)
 *  - H2H             → 24h (données historiques quasi-statiques)
 *  - Classement      → 24h (mis à jour 1× par jour)
 *  - Blessures       → 2h  (peuvent changer la veille du match)
 */

const {
  getTeamRecentForm,
  getHeadToHead,
  getStandings,
  getInjuries,
  CURRENT_SEASON,
} = require('./footballApi');

// ─── Cache mémoire avec TTL ────────────────────────────────────────────────────
const _cache = new Map();

function cacheGet(key) {
  const entry = _cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { _cache.delete(key); return null; }
  return entry.value;
}

function cacheSet(key, value, ttlMs) {
  _cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

const TTL = {
  FORM:      6  * 60 * 60 * 1000,  // 6 heures
  H2H:       24 * 60 * 60 * 1000,  // 24 heures
  STANDINGS: 24 * 60 * 60 * 1000,  // 24 heures
  INJURIES:  2  * 60 * 60 * 1000,  // 2 heures
};

// ─── Récupération avec cache ───────────────────────────────────────────────────
async function cachedForm(teamId) {
  if (!teamId) return [];
  const key = `form:${teamId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await getTeamRecentForm(teamId, 5);
  cacheSet(key, data, TTL.FORM);
  return data;
}

async function cachedH2H(homeTeamId, awayTeamId) {
  if (!homeTeamId || !awayTeamId) return [];
  const key = `h2h:${homeTeamId}-${awayTeamId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await getHeadToHead(homeTeamId, awayTeamId, 5);
  cacheSet(key, data, TTL.H2H);
  return data;
}

async function cachedStandings(leagueId) {
  if (!leagueId) return [];
  const key = `standings:${leagueId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await getStandings(leagueId, CURRENT_SEASON);
  cacheSet(key, data, TTL.STANDINGS);
  return data;
}

async function cachedInjuries(fixtureExternalId) {
  if (!fixtureExternalId) return [];
  const key = `injuries:${fixtureExternalId}`;
  const hit = cacheGet(key);
  if (hit) return hit;
  const data = await getInjuries(fixtureExternalId);
  cacheSet(key, data, TTL.INJURIES);
  return data;
}

// ─── Formatage pour le prompt ──────────────────────────────────────────────────

/**
 * Résume la forme récente d'une équipe en texte lisible.
 * Ex: "PSG : V(2-0) N(1-1) V(3-1) D(0-2) V(2-1) — 3V 1N 1D"
 */
function formatForm(teamName, matches) {
  if (!matches || matches.length === 0) return null;

  const results = matches.map((m) => {
    const isHome = m.homeTeam === teamName;
    const gf     = isHome ? m.homeScore : m.awayScore;
    const ga     = isHome ? m.awayScore : m.homeScore;
    if (gf === null || ga === null) return null;
    const letter = gf > ga ? 'V' : gf === ga ? 'N' : 'D';
    return `${letter}(${gf}-${ga})`;
  }).filter(Boolean);

  if (!results.length) return null;

  const wins   = results.filter((r) => r.startsWith('V')).length;
  const draws  = results.filter((r) => r.startsWith('N')).length;
  const losses = results.filter((r) => r.startsWith('D')).length;
  const goals  = matches.reduce((acc, m) => {
    const isHome = m.homeTeam === teamName;
    return acc + (isHome ? (m.homeScore ?? 0) : (m.awayScore ?? 0));
  }, 0);

  return `${teamName} : ${results.join(' ')} — ${wins}V ${draws}N ${losses}D, ${goals} buts marqués`;
}

/**
 * Résume les confrontations directes.
 * Ex: "H2H (5 derniers) : PSG 3V | 1N | Lyon 1V"
 */
function formatH2H(homeTeam, awayTeam, matches) {
  if (!matches || matches.length === 0) return null;

  let homeWins = 0, draws = 0, awayWins = 0;
  const lines = [];

  for (const m of matches) {
    const hScore = m.homeScore, aScore = m.awayScore;
    if (hScore === null || aScore === null) continue;

    // Normaliser selon qui est home/away dans notre contexte
    const homeIsHome = m.homeTeam === homeTeam;
    const hGoals = homeIsHome ? hScore : aScore;
    const aGoals = homeIsHome ? aScore : hScore;

    if (hGoals > aGoals) homeWins++;
    else if (hGoals === aGoals) draws++;
    else awayWins++;

    const date = m.date ? new Date(m.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '';
    lines.push(`  ${m.homeTeam} ${m.homeScore}-${m.awayScore} ${m.awayTeam} (${date})`);
  }

  if (!lines.length) return null;

  const summary = `H2H — ${homeTeam} ${homeWins}V | ${draws}N | ${awayTeam} ${awayWins}V (5 derniers) :\n${lines.join('\n')}`;
  return summary;
}

/**
 * Trouve la position d'une équipe dans le classement.
 * Ex: "PSG : 1er (52pts, +28 GD)"
 */
function formatStandingEntry(teamId, teamName, standings) {
  if (!standings || standings.length === 0) return null;
  const entry = standings.find((s) => String(s.team.id) === String(teamId));
  if (!entry) return null;
  return `${teamName} : ${entry.rank}e (${entry.Pts}pts, ${entry.GD >= 0 ? '+' : ''}${entry.GD} GD, ${entry.W}V-${entry.D}N-${entry.L}D)`;
}

/**
 * Résume les blessures/suspensions.
 */
function formatInjuries(injuries) {
  if (!injuries || injuries.length === 0) return null;
  const lines = injuries
    .slice(0, 8) // max 8 joueurs pour ne pas exploser le prompt
    .map((i) => `  ${i.player} (${i.team}) — ${i.type}${i.reason ? ': ' + i.reason : ''}`);
  return `Absents/Blessés :\n${lines.join('\n')}`;
}

// ─── Fonction principale ───────────────────────────────────────────────────────

/**
 * Construit le contexte complet d'un match pour le prompt IA.
 * Appels API en parallèle + cache → ~3 requêtes max par match non-caché.
 *
 * @param {Object} match  — { homeTeam, awayTeam, homeTeamId, awayTeamId, externalId, competition }
 * @returns {Object|null} — { text: string, hasData: boolean }
 */
async function getMatchContext(match) {
  const homeTeamId = match.homeTeamId;
  const awayTeamId = match.awayTeamId;
  const leagueId   = match.competition?.externalId;
  const fixtureId  = match.externalId;

  // Récupérer en parallèle (on ne bloque pas si une source échoue)
  const [
    homeFormResult,
    awayFormResult,
    h2hResult,
    standingsResult,
    injuriesResult,
  ] = await Promise.allSettled([
    cachedForm(homeTeamId),
    cachedForm(awayTeamId),
    cachedH2H(homeTeamId, awayTeamId),
    cachedStandings(leagueId),
    cachedInjuries(fixtureId),
  ]);

  const homeForm  = homeFormResult.status  === 'fulfilled' ? homeFormResult.value  : [];
  const awayForm  = awayFormResult.status  === 'fulfilled' ? awayFormResult.value  : [];
  const h2h       = h2hResult.status       === 'fulfilled' ? h2hResult.value       : [];
  const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : [];
  const injuries  = injuriesResult.status  === 'fulfilled' ? injuriesResult.value  : [];

  // Formater chaque section
  const sections = [
    formatForm(match.homeTeam, homeForm),
    formatForm(match.awayTeam, awayForm),
    formatH2H(match.homeTeam, match.awayTeam, h2h),
    formatStandingEntry(homeTeamId, match.homeTeam, standings)
      ? `Classement :\n  ${formatStandingEntry(homeTeamId, match.homeTeam, standings)}\n  ${formatStandingEntry(awayTeamId, match.awayTeam, standings) || ''}`
      : null,
    formatInjuries(injuries),
  ].filter(Boolean);

  const hasData = sections.length > 0;

  return {
    hasData,
    text: sections.join('\n\n'),
    raw: { homeForm, awayForm, h2h, standings, injuries },
  };
}

module.exports = { getMatchContext };
