/**
 * Service API-Football officiel (api-football.com — accès direct api-sports)
 * ─────────────────────────────────────────────────────────────────────────────
 * Base URL : https://v3.football.api-sports.io
 * Auth     : x-apisports-key header (clé dans dashboard.api-football.com)
 * Quota    : 100 req/jour (plan gratuit) — toutes les fonctions sont rate-limit aware
 *
 * Endpoints utilisés :
 *  GET /fixtures?date=YYYY-MM-DD          — matchs d'une date
 *  GET /fixtures?live=all                 — matchs en direct
 *  GET /fixtures?id=ID                    — détail d'un match
 *  GET /fixtures/statistics?fixture=ID   — stats du match
 *  GET /fixtures/lineups?fixture=ID       — compositions
 *  GET /fixtures/headtohead?h2h=T1-T2    — historique face-à-face
 *  GET /fixtures?team=ID&last=5           — forme récente d'une équipe
 *  GET /injuries?fixture=ID              — blessures
 *  GET /predictions?fixture=ID           — prédictions intégrées API
 *  GET /standings?league=ID&season=YEAR  — classement
 *  GET /leagues                          — liste des compétitions
 */

const axios = require('axios');
const env   = require('../config/env');

// ─── Client HTTP ───────────────────────────────────────────────────────────────
const apiClient = axios.create({
  baseURL: env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io',
  headers: {
    'x-apisports-key': env.FOOTBALL_API_KEY || '',
  },
  timeout: 15000,
});

// ─── Saison courante ────────────────────────────────────────────────────────────
// En juillet 2026 → 2026 ; en janvier 2026 → 2025 (saison 2025-26 → key = 2025)
const CURRENT_SEASON = (() => {
  const now = new Date();
  return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
})();

// ─── Mapping statuts API-Football → statuts internes ──────────────────────────
const FINISHED_STATUSES  = new Set(['FT', 'AET', 'PEN']);
const LIVE_STATUSES      = new Set(['1H', '2H', 'ET', 'BT', 'P', 'HT', 'LIVE']);
const POSTPONED_STATUSES = new Set(['PST', 'SUSP', 'INT', 'ABD']);
const CANCELLED_STATUSES = new Set(['CANC', 'WO', 'AWD']);

function mapStatus(short) {
  if (FINISHED_STATUSES.has(short))  return 'FINISHED';
  if (LIVE_STATUSES.has(short))      return 'LIVE';
  if (POSTPONED_STATUSES.has(short)) return 'POSTPONED';
  if (CANCELLED_STATUSES.has(short)) return 'CANCELLED';
  return 'SCHEDULED';
}

// ─── Mock (développement sans clé) ────────────────────────────────────────────
function getMockedFixtures() {
  const now      = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  // Format identique à l'API réelle pour que normalizeMatch fonctionne
  return [
    {
      fixture: { id: 9900001, date: tomorrow.toISOString(), venue: { name: 'Parc des Princes' }, status: { short: 'NS', elapsed: null } },
      league:  { id: 61, name: 'Ligue 1', country: 'France', logo: 'https://media.api-sports.io/football/leagues/61.png', round: 'Journée 28', season: CURRENT_SEASON },
      teams:   { home: { id: 85, name: 'Paris Saint-Germain', logo: 'https://media.api-sports.io/football/teams/85.png' }, away: { id: 80, name: 'Olympique Lyonnais', logo: 'https://media.api-sports.io/football/teams/80.png' } },
      goals:   { home: null, away: null },
    },
    {
      fixture: { id: 9900002, date: now.toISOString(), venue: { name: 'Etihad Stadium' }, status: { short: '2H', elapsed: 67 } },
      league:  { id: 39, name: 'Premier League', country: 'England', logo: 'https://media.api-sports.io/football/leagues/39.png', round: 'Round 29', season: CURRENT_SEASON },
      teams:   { home: { id: 50, name: 'Manchester City', logo: 'https://media.api-sports.io/football/teams/50.png' }, away: { id: 42, name: 'Arsenal', logo: 'https://media.api-sports.io/football/teams/42.png' } },
      goals:   { home: 1, away: 1 },
    },
    {
      fixture: { id: 9900003, date: new Date(now - 3600000).toISOString(), venue: { name: 'Santiago Bernabéu' }, status: { short: 'FT', elapsed: 90 } },
      league:  { id: 140, name: 'La Liga', country: 'Spain', logo: 'https://media.api-sports.io/football/leagues/140.png', round: 'Journée 27', season: CURRENT_SEASON },
      teams:   { home: { id: 541, name: 'Real Madrid', logo: 'https://media.api-sports.io/football/teams/541.png' }, away: { id: 529, name: 'Barcelona', logo: 'https://media.api-sports.io/football/teams/529.png' } },
      goals:   { home: 2, away: 1 },
    },
  ];
}

// ─── Normalisation fixture API-Football → format Prisma ────────────────────────
function normalizeMatch(fixture, competitionId) {
  const f      = fixture.fixture;
  const teams  = fixture.teams;
  const goals  = fixture.goals;
  const status = f.status || {};

  const matchStatus = mapStatus(status.short || '');

  let minute = null;
  if (matchStatus === 'LIVE') {
    minute = status.short === 'HT' ? 'HT' : (status.elapsed ? `${status.elapsed}'` : null);
  }

  return {
    externalId:    String(f.id),
    competitionId,
    homeTeam:      teams.home.name,
    homeTeamId:    String(teams.home.id),
    homeTeamLogo:  teams.home.logo || null,
    awayTeam:      teams.away.name,
    awayTeamId:    String(teams.away.id),
    awayTeamLogo:  teams.away.logo || null,
    homeScore:     goals.home ?? null,
    awayScore:     goals.away ?? null,
    status:        matchStatus,
    minute,
    scheduledAt:   new Date(f.date),
    venue:         f.venue?.name || null,
    round:         fixture.league?.round || null,
  };
}

// ─── Normalisation stats API-Football → format interne ────────────────────────
function normalizeStatistics(rawStats) {
  if (!Array.isArray(rawStats) || rawStats.length === 0) return null;

  // API-Football retourne un tableau par équipe : [{ team, statistics: [{type, value}] }]
  // On prend les stats de l'équipe domicile (index 0) et extérieur (index 1) et on les merge
  const homeStats = rawStats[0]?.statistics || [];
  const awayStats = rawStats[1]?.statistics || [];

  const awayMap = {};
  awayStats.forEach((s) => { awayMap[s.type] = s.value; });

  const result = homeStats.map((s) => ({
    key:   s.type.toLowerCase().replace(/\s+/g, '_'),
    label: s.type,
    home:  Number(s.value ?? 0),
    away:  Number(awayMap[s.type] ?? 0),
    isPct: String(s.value).includes('%'),
  })).filter((s) => s.label);

  return result.length ? result : null;
}

// ─── Helper fetch avec log ─────────────────────────────────────────────────────
async function apiFetch(endpoint, params = {}) {
  const { data } = await apiClient.get(endpoint, { params });
  return data.response || [];
}

// ─── 1. Matchs d'une date ────────────────────────────────────────────────────
async function getFixturesByDate(date) {
  if (!env.FOOTBALL_API_KEY) {
    console.warn('[FootballAPI] Pas de clé — données mockées');
    return getMockedFixtures();
  }
  try {
    // date = YYYY-MM-DD (format natif API-Football)
    return await apiFetch('/fixtures', { date });
  } catch (err) {
    console.error('[FootballAPI] getFixturesByDate:', err.message);
    return getMockedFixtures();
  }
}

// ─── 2. Matchs en direct ─────────────────────────────────────────────────────
async function getLiveMatches() {
  if (!env.FOOTBALL_API_KEY) {
    return getMockedFixtures().filter((f) => LIVE_STATUSES.has(f.fixture.status.short));
  }
  try {
    return await apiFetch('/fixtures', { live: 'all' });
  } catch (err) {
    console.error('[FootballAPI] getLiveMatches:', err.message);
    return [];
  }
}

// ─── 3. Détail d'un match par ID externe ──────────────────────────────────────
async function getFixtureById(externalId) {
  if (!env.FOOTBALL_API_KEY) {
    return getMockedFixtures().find((f) => String(f.fixture.id) === String(externalId)) || null;
  }
  try {
    const res = await apiFetch('/fixtures', { id: externalId });
    return res[0] || null;
  } catch (err) {
    console.error('[FootballAPI] getFixtureById:', err.message);
    return null;
  }
}

// ─── 4. Statistiques d'un match (possession, tirs, fautes…) ──────────────────
async function getFixtureStatistics(externalId) {
  if (!env.FOOTBALL_API_KEY || !externalId || String(externalId).startsWith('mock')) return null;
  try {
    const raw = await apiFetch('/fixtures/statistics', { fixture: externalId });
    return normalizeStatistics(raw);
  } catch (err) {
    console.error('[FootballAPI] getFixtureStatistics:', err.message);
    return null;
  }
}

// ─── 5. Compositions (startXI + substituts) ───────────────────────────────────
async function getFixtureLineups(externalId) {
  if (!env.FOOTBALL_API_KEY || !externalId || String(externalId).startsWith('mock')) return null;
  try {
    const raw = await apiFetch('/fixtures/lineups', { fixture: externalId });
    if (!Array.isArray(raw) || raw.length === 0) return null;

    // Retourner les deux équipes avec formation + titulaires + remplaçants
    return raw.map((team) => ({
      team:         team.team,
      formation:    team.formation,
      coach:        team.coach,
      startXI:      (team.startXI  || []).map((p) => p.player),
      substitutes:  (team.substitutes || []).map((p) => p.player),
    }));
  } catch (err) {
    console.error('[FootballAPI] getFixtureLineups:', err.message);
    return null;
  }
}

// ─── 6. Historique face-à-face ────────────────────────────────────────────────
async function getHeadToHead(homeTeamId, awayTeamId, last = 10) {
  if (!env.FOOTBALL_API_KEY || !homeTeamId || !awayTeamId) return [];
  try {
    const raw = await apiFetch('/fixtures/headtohead', {
      h2h:  `${homeTeamId}-${awayTeamId}`,
      last,
    });
    // Normaliser en format compact pour le frontend
    return raw.map((f) => ({
      id:        String(f.fixture.id),
      date:      f.fixture.date,
      homeTeam:  f.teams.home.name,
      awayTeam:  f.teams.away.name,
      homeScore: f.goals.home,
      awayScore: f.goals.away,
      competition: f.league.name,
    }));
  } catch (err) {
    console.error('[FootballAPI] getHeadToHead:', err.message);
    return [];
  }
}

// ─── 7. Forme récente d'une équipe (5 derniers matchs) ───────────────────────
async function getTeamRecentForm(teamId, last = 5) {
  if (!env.FOOTBALL_API_KEY || !teamId || String(teamId).startsWith('mock')) return [];
  try {
    const raw = await apiFetch('/fixtures', { team: teamId, last, season: CURRENT_SEASON });
    return raw
      .filter((f) => FINISHED_STATUSES.has(f.fixture.status.short))
      .map((f) => ({
        id:        String(f.fixture.id),
        date:      f.fixture.date,
        homeTeam:  f.teams.home.name,
        awayTeam:  f.teams.away.name,
        homeScore: f.goals.home,
        awayScore: f.goals.away,
        competition: f.league.name,
      }));
  } catch (err) {
    console.error('[FootballAPI] getTeamRecentForm:', err.message);
    return [];
  }
}

// ─── 8. Blessures liées à un match ───────────────────────────────────────────
async function getInjuries(externalId) {
  if (!env.FOOTBALL_API_KEY || !externalId || String(externalId).startsWith('mock')) return [];
  try {
    const raw = await apiFetch('/injuries', { fixture: externalId });
    return raw.map((i) => ({
      player:   i.player.name,
      team:     i.team.name,
      type:     i.player.type,
      reason:   i.player.reason,
    }));
  } catch (err) {
    console.error('[FootballAPI] getInjuries:', err.message);
    return [];
  }
}

// ─── 9. Prédictions intégrées API-Football ───────────────────────────────────
async function getPredictions(externalId) {
  if (!env.FOOTBALL_API_KEY || !externalId || String(externalId).startsWith('mock')) return null;
  try {
    const raw = await apiFetch('/predictions', { fixture: externalId });
    const pred = raw[0]?.predictions;
    if (!pred) return null;

    return {
      winner:       pred.winner,
      winOrDraw:    pred.win_or_draw,
      underOver:    pred.under_over,
      goals:        pred.goals,
      advice:       pred.advice,
      percent:      pred.percent, // { home, draw, away }
    };
  } catch (err) {
    console.error('[FootballAPI] getPredictions:', err.message);
    return null;
  }
}

// ─── 10. Classement d'une ligue ───────────────────────────────────────────────
async function getStandings(leagueId, season = CURRENT_SEASON) {
  if (!env.FOOTBALL_API_KEY) return [];
  try {
    const raw = await apiFetch('/standings', { league: leagueId, season });
    const table = raw[0]?.league?.standings?.[0];
    if (!Array.isArray(table)) return [];

    return table.map((entry) => ({
      rank:   entry.rank,
      team:   { id: entry.team.id, name: entry.team.name, logo: entry.team.logo },
      MP:     entry.all.played,
      W:      entry.all.win,
      D:      entry.all.draw,
      L:      entry.all.lose,
      GF:     entry.all.goals.for,
      GA:     entry.all.goals.against,
      GD:     entry.goalsDiff,
      Pts:    entry.points,
      form:   entry.form,
      status: entry.status,
    }));
  } catch (err) {
    console.error('[FootballAPI] getStandings:', err.message);
    return [];
  }
}

// ─── 11. Liste des compétitions ───────────────────────────────────────────────
async function getAllLeagues() {
  if (!env.FOOTBALL_API_KEY) return [];
  try {
    const raw = await apiFetch('/leagues', { current: true });
    return raw.map((item) => ({
      id:      item.league.id,
      name:    item.league.name,
      type:    item.league.type,
      logo:    item.league.logo,
      country: item.country.name,
      season:  item.seasons?.find((s) => s.current)?.year,
    }));
  } catch (err) {
    console.error('[FootballAPI] getAllLeagues:', err.message);
    return [];
  }
}

// ─── Évènements d'un match (buts, cartons, remplacements) ────────────────────
async function getFixtureEvents(fixtureId) {
  try {
    if (!env.FOOTBALL_API_KEY) return [];
    const { data } = await apiClient.get('/fixtures/events', { params: { fixture: fixtureId } });
    return data?.response || [];
  } catch (err) {
    console.error('[FootballAPI] getFixtureEvents:', err.message);
    return [];
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  // Fixtures
  getFixturesByDate,
  getLiveMatches,
  getFixtureById,
  // Stats & données enrichies
  getFixtureStatistics,
  getFixtureLineups,
  getHeadToHead,
  getTeamRecentForm,
  getInjuries,
  getPredictions,
  getFixtureEvents,
  // Méta
  getStandings,
  getAllLeagues,
  // Helpers
  normalizeMatch,
  normalizeStatistics,
  CURRENT_SEASON,
};
