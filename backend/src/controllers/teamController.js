const env = require('../config/env');
const axios = require('axios');
const { AppError } = require('../middleware/errorHandler');

const footballApi = axios.create({
  baseURL: env.FOOTBALL_API_BASE_URL || 'https://v3.football.api-sports.io',
  headers: { 'x-apisports-key': env.FOOTBALL_API_KEY },
  timeout: 10000,
});

// Cache simple par teamId (1h)
const teamCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;

function getFromCache(key) {
  const entry = teamCache.get(key);
  if (entry && Date.now() - entry.at < CACHE_TTL) return entry.data;
  return null;
}
function setCache(key, data) {
  teamCache.set(key, { data, at: Date.now() });
}

// GET /teams/:id
async function getTeam(req, res, next) {
  try {
    if (!env.FOOTBALL_API_KEY) throw new AppError('API foot non configurée', 503, 'SERVICE_UNAVAILABLE');

    const { id } = req.params;
    const season = new Date().getFullYear();

    const cached = getFromCache(`team-${id}`);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const [teamRes, statsRes] = await Promise.allSettled([
      footballApi.get('/teams', { params: { id } }),
      footballApi.get('/teams/statistics', { params: { team: id, season } }),
    ]);

    const team  = teamRes.status === 'fulfilled' ? teamRes.value.data?.response?.[0] : null;
    const stats = statsRes.status === 'fulfilled' ? statsRes.value.data?.response : null;

    if (!team) throw new AppError('Équipe introuvable', 404, 'NOT_FOUND');

    const result = { team: team.team, venue: team.venue, stats };
    setCache(`team-${id}`, result);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /teams/:id/squad
async function getSquad(req, res, next) {
  try {
    if (!env.FOOTBALL_API_KEY) throw new AppError('API foot non configurée', 503, 'SERVICE_UNAVAILABLE');

    const { id } = req.params;
    const cached = getFromCache(`squad-${id}`);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const { data } = await footballApi.get('/players/squads', { params: { team: id } });
    const squad = data?.response?.[0]?.players || [];
    setCache(`squad-${id}`, squad);

    res.json({ success: true, data: squad });
  } catch (err) { next(err); }
}

// GET /teams/:id/fixtures — derniers + prochains matchs
async function getTeamFixtures(req, res, next) {
  try {
    if (!env.FOOTBALL_API_KEY) throw new AppError('API foot non configurée', 503, 'SERVICE_UNAVAILABLE');

    const { id } = req.params;
    const cacheKey = `fixtures-${id}`;
    const cached = getFromCache(cacheKey);
    if (cached) return res.json({ success: true, data: cached, fromCache: true });

    const [lastRes, nextRes] = await Promise.allSettled([
      footballApi.get('/fixtures', { params: { team: id, last: 5 } }),
      footballApi.get('/fixtures', { params: { team: id, next: 5 } }),
    ]);

    const last = lastRes.status === 'fulfilled' ? lastRes.value.data?.response || [] : [];
    const next = nextRes.status === 'fulfilled' ? nextRes.value.data?.response || [] : [];

    const result = { last, next };
    setCache(cacheKey, result);

    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

module.exports = { getTeam, getSquad, getTeamFixtures };
