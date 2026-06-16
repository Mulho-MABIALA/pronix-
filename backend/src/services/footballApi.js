// Couche d'abstraction pour Free API Live Football Data (RapidAPI / FotMob)
// Host: free-api-live-football-data.p.rapidapi.com
// Format date : YYYYMMDD (sans tirets)
// Format réponse : { status: "success", response: { matches: [...] } }
const axios = require('axios');
const env = require('../config/env');

// ─── Client HTTP ───────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: env.FOOTBALL_API_BASE_URL,
  headers: {
    'X-RapidAPI-Key': env.FOOTBALL_API_KEY,
    'X-RapidAPI-Host': env.FOOTBALL_API_HOST,
  },
  timeout: 12000,
});

// ─── Utilitaire : YYYY-MM-DD → YYYYMMDD ───────────────────────────────────────
function toApiDate(dateStr) {
  // Accepte "2025-05-18" ou "20250518"
  return dateStr.replace(/-/g, '');
}

// ─── Données mockées (mode sans clé API) ──────────────────────────────────────
function getMockedMatches() {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return [
    {
      externalId: 'mock-1', competitionId: 'mock-ligue1',
      homeTeam: 'Paris Saint-Germain', homeTeamId: '8633', homeTeamLogo: '',
      awayTeam: 'Olympique de Marseille', awayTeamId: '8384', awayTeamLogo: '',
      homeScore: null, awayScore: null, status: 'SCHEDULED',
      scheduledAt: tomorrow.toISOString(), venue: 'Parc des Princes', round: 'Journée 28',
    },
    {
      externalId: 'mock-2', competitionId: 'mock-liga',
      homeTeam: 'Real Madrid', homeTeamId: '8633', homeTeamLogo: '',
      awayTeam: 'FC Barcelona', awayTeamId: '8634', awayTeamLogo: '',
      homeScore: 2, awayScore: 1, status: 'FINISHED',
      scheduledAt: now.toISOString(), venue: 'Santiago Bernabéu', round: 'Journée 27',
    },
    {
      externalId: 'mock-3', competitionId: 'mock-pl',
      homeTeam: 'Manchester City', homeTeamId: '8456', homeTeamLogo: '',
      awayTeam: 'Arsenal', awayTeamId: '9825', awayTeamLogo: '',
      homeScore: 1, awayScore: 1, status: 'LIVE', minute: "67'",
      scheduledAt: now.toISOString(), venue: 'Etihad Stadium', round: 'Journée 29',
    },
  ];
}

// ─── Normalisation FotMob → format interne ────────────────────────────────────
// Structure FotMob :
// { id, leagueId, time, home:{id,score,name}, away:{id,score,name},
//   status:{utcTime,finished,started,cancelled,scoreStr,reason:{short}} }
function normalizeMatch(match, competitionId) {
  const s = match.status || {};

  let status;
  if (s.cancelled) status = 'CANCELLED';
  else if (s.finished) status = 'FINISHED';
  else if (s.started) status = 'LIVE';
  else status = 'SCHEDULED';

  let scheduledAt;
  try {
    scheduledAt = s.utcTime ? new Date(s.utcTime) : new Date();
  } catch {
    scheduledAt = new Date();
  }

  const homeScore = (s.started && match.home?.score !== undefined) ? match.home.score : null;
  const awayScore = (s.started && match.away?.score !== undefined) ? match.away.score : null;

  // Minute du match : FotMob expose status.liveTime.short ("45'") ou status.reason.short ("HT")
  let minute = null;
  if (status === 'LIVE') {
    minute = s.liveTime?.short || s.reason?.short || null;
  }

  const homeTeamId = String(match.home?.id || '');
  const awayTeamId = String(match.away?.id || '');

  // Logos via CDN FotMob — format stable : /teamlogo/{id}.png
  const logoUrl = (id) => id
    ? `https://images.fotmob.com/image_resources/logo/teamlogo/${id}.png`
    : null;

  return {
    externalId: String(match.id),
    competitionId,
    homeTeam: match.home?.longName || match.home?.name || 'Équipe domicile',
    homeTeamId,
    homeTeamLogo: logoUrl(homeTeamId),
    awayTeam: match.away?.longName || match.away?.name || 'Équipe extérieur',
    awayTeamId,
    awayTeamLogo: logoUrl(awayTeamId),
    homeScore,
    awayScore,
    status,
    minute,
    scheduledAt,
    venue: null,
    round: match.tournamentStage ? `Journée ${match.tournamentStage}` : null,
  };
}

// ─── Extraction du tableau de matchs ─────────────────────────────────────────
function extractMatches(responseData) {
  // Format principal : { status:"success", response:{ matches:[...] } }
  if (Array.isArray(responseData?.response?.matches)) return responseData.response.matches;
  // Format alternatif : { response: [...] }
  if (Array.isArray(responseData?.response)) return responseData.response;
  // Format legacy : { data: { matches: [...] } }
  if (Array.isArray(responseData?.data?.matches)) return responseData.data.matches;
  if (Array.isArray(responseData?.data)) return responseData.data;
  return [];
}

// ─── Méthodes publiques ────────────────────────────────────────────────────────

async function getFixturesByDate(date) {
  if (!env.FOOTBALL_API_KEY) {
    console.warn('[FootballAPI] Pas de clé API — données mockées');
    return getMockedMatches();
  }
  try {
    const response = await apiClient.get('/football-get-matches-by-date', {
      params: { date: toApiDate(date) },
    });
    if (response.data?.status === 'failed') {
      console.warn('[FootballAPI] API réponse failed pour date', date);
      return [];
    }
    return extractMatches(response.data);
  } catch (err) {
    console.error('[FootballAPI] getFixturesByDate error:', err.message);
    return getMockedMatches();
  }
}

async function getLiveMatches() {
  if (!env.FOOTBALL_API_KEY) {
    return getMockedMatches().filter((m) => m.status === 'LIVE');
  }
  try {
    // Récupère les matchs du jour et filtre ceux en cours
    const today = new Date().toISOString().split('T')[0];
    const allMatches = await getFixturesByDate(today);
    return allMatches.filter((m) => {
      const s = m.status || {};
      return s.started && !s.finished && !s.cancelled;
    });
  } catch (err) {
    console.error('[FootballAPI] getLiveMatches error:', err.message);
    return [];
  }
}

async function getFixtureById(fixtureId) {
  if (!env.FOOTBALL_API_KEY) {
    return getMockedMatches().find((m) => m.externalId === String(fixtureId)) || null;
  }
  try {
    // Pas d'endpoint dédié connu — on cherche dans les matchs du jour
    const today = new Date().toISOString().split('T')[0];
    const matches = await getFixturesByDate(today);
    const found = matches.find((m) => String(m.id) === String(fixtureId));
    return found || null;
  } catch (err) {
    console.error('[FootballAPI] getFixtureById error:', err.message);
    return null;
  }
}

async function getAllLeagues() {
  if (!env.FOOTBALL_API_KEY) return [];
  try {
    const response = await apiClient.get('/football-get-all-leagues');
    return response.data?.response?.leagues || [];
  } catch (err) {
    console.error('[FootballAPI] getAllLeagues error:', err.message);
    return [];
  }
}

// ─── Statistiques d'un match ──────────────────────────────────────────────────
function normalizeStatistics(raw) {
  if (!raw) return null;

  // Format tableau direct : [{ key, homeValue, awayValue, name }]
  if (Array.isArray(raw)) {
    const result = raw.map((s) => ({
      key:   s.key   || s.type  || '',
      label: s.name  || s.title || s.key || '',
      home:  Number(s.homeValue ?? s.home ?? 0),
      away:  Number(s.awayValue ?? s.away ?? 0),
    })).filter((s) => s.label);
    return result.length ? result : null;
  }

  // Format imbriqué FotMob : { Periods: { All: { stats: [...] } } }
  const nested =
    raw?.Periods?.All?.stats ||
    raw?.Periods?.[0]?.stats ||
    raw?.stats ||
    raw?.statistics;

  if (nested) return normalizeStatistics(nested);

  return null;
}

async function getFixtureStatistics(externalMatchId) {
  if (!env.FOOTBALL_API_KEY) return null;
  if (!externalMatchId || String(externalMatchId).startsWith('mock')) return null;

  for (const endpoint of ['/football-get-match-details', '/football-get-match-statistics']) {
    try {
      const { data } = await apiClient.get(endpoint, { params: { matchId: externalMatchId } });

      const raw =
        data?.response?.stats         ||
        data?.response?.statistics    ||
        data?.response?.content?.stats ||
        data?.stats                    ||
        data?.statistics               ||
        null;

      if (raw) {
        const normalized = normalizeStatistics(raw);
        if (normalized) return normalized;
      }
    } catch (err) {
      if (err?.response?.status !== 404) {
        console.error(`[FootballAPI] getFixtureStatistics (${endpoint}):`, err.message);
      }
    }
  }
  return null;
}

async function getHeadToHead() { return []; }
async function getFixtureLineups() { return []; }
async function getStandings() { return []; }
async function getTeamRecentForm() { return []; }
async function getInjuries() { return []; }

module.exports = {
  getFixturesByDate,
  getLiveMatches,
  getFixtureById,
  getAllLeagues,
  getHeadToHead,
  getFixtureLineups,
  getFixtureStatistics,
  getStandings,
  getTeamRecentForm,
  getInjuries,
  normalizeMatch,
  normalizeStatistics,
};
