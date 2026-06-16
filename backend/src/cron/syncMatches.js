// Cron : synchronisation des matchs depuis Free API Live Football Data
const cron = require('node-cron');
const prisma = require('../config/database');
const footballApi = require('../services/footballApi');
const { broadcastNotification } = require('../controllers/pushController');
const { calculatePredictionsForDate } = require('../services/predictionService');

// Cache des dates déjà synchronisées (protection quota RapidAPI)
const syncCache = new Map();
const SYNC_COOLDOWN_MS = 15 * 60 * 1000;

function isCoolingDown(dateStr) {
  const last = syncCache.get(dateStr);
  return last && Date.now() - last < SYNC_COOLDOWN_MS;
}

// Cache local compétition : évite N requêtes DB par sync (externalId → Competition)
const compCache = new Map();

// Groupes WC2026 : FotMob crée un ID par groupe (894790=A, 894791=B…)
function resolveLeagueId(rawLeagueId) {
  const n = Number(rawLeagueId);
  if (n >= 894790 && n <= 894810) return '894790';
  return rawLeagueId;
}

// Trouve ou crée dynamiquement une compétition depuis les données du match
async function findOrCreateCompetition(fixture, leagueExternalId) {
  if (compCache.has(leagueExternalId)) return compCache.get(leagueExternalId);

  let competition = await prisma.competition.findUnique({
    where: { externalId: leagueExternalId },
  });

  if (!competition) {
    const name = fixture.leagueName
      || fixture.league?.name
      || fixture.competition?.name
      || fixture.tournament?.name
      || null;

    const country = fixture.countryName
      || fixture.country?.name
      || fixture.league?.country
      || fixture.competition?.country
      || 'International';

    if (!name) return null;

    try {
      competition = await prisma.competition.create({
        data: { externalId: leagueExternalId, name, country, isDisplayed: true },
      });
      console.log(`[Sync] Nouvelle compétition: ${name} (${country}) [${leagueExternalId}]`);
    } catch {
      // Race condition → re-fetch
      competition = await prisma.competition.findUnique({
        where: { externalId: leagueExternalId },
      });
    }
  }

  if (competition) compCache.set(leagueExternalId, competition);
  return competition;
}

async function syncMatchesForDate(dateStr) {
  if (isCoolingDown(dateStr)) {
    console.log(`[Cron syncMatches] ${dateStr} — cooldown actif, ignoré`);
    return;
  }
  syncCache.set(dateStr, Date.now());

  console.log(`[Cron syncMatches] Synchronisation pour : ${dateStr}`);
  let synced = 0;

  try {
    const fixtures = await footballApi.getFixturesByDate(dateStr);
    if (!Array.isArray(fixtures) || fixtures.length === 0) {
      console.log('[Cron syncMatches] Aucun match retourné');
      return;
    }

    for (const fixture of fixtures) {
      const rawLeagueId = String(
        fixture.leagueId || fixture.league?.id || fixture.competition?.id || ''
      );
      if (!rawLeagueId) continue;

      const leagueExternalId = resolveLeagueId(rawLeagueId);
      const competition = await findOrCreateCompetition(fixture, leagueExternalId);
      if (!competition) continue;

      const normalized = footballApi.normalizeMatch(fixture, competition.id);
      if (!normalized.externalId || normalized.externalId === 'undefined') continue;

      await prisma.match.upsert({
        where: { externalId: normalized.externalId },
        update: {
          homeScore:    normalized.homeScore,
          awayScore:    normalized.awayScore,
          status:       normalized.status,
          minute:       normalized.minute ?? null,
          round:        normalized.round,
          homeTeamLogo: normalized.homeTeamLogo,
          awayTeamLogo: normalized.awayTeamLogo,
        },
        create: normalized,
      });
      synced++;
    }
  } catch (err) {
    console.error('[Cron syncMatches] Erreur:', err.message);
  }

  console.log(`[Cron syncMatches] ${synced} matchs synchronisés`);

  if (synced > 0) {
    calculatePredictionsForDate(dateStr).catch((e) =>
      console.error('[Cron syncMatches] Prédictions:', e.message)
    );
  }
}

async function syncLiveMatches() {
  try {
    const liveRaw = await footballApi.getLiveMatches();
    if (!Array.isArray(liveRaw) || liveRaw.length === 0) return;

    for (const fixture of liveRaw) {
      const externalId = String(fixture.id || fixture.matchId || '');
      if (!externalId) continue;

      const match = await prisma.match.findUnique({ where: { externalId } });
      if (!match) continue;

      const normalized = footballApi.normalizeMatch(fixture, match.competitionId);
      const wasLive = match.status === 'LIVE';
      const nowLive = normalized.status === 'LIVE';

      await prisma.match.update({
        where: { id: match.id },
        data: {
          homeScore: normalized.homeScore,
          awayScore: normalized.awayScore,
          status:    normalized.status,
          minute:    normalized.minute ?? null,
        },
      });

      if (!wasLive && nowLive) {
        broadcastNotification({
          title: '🔴 Match en direct',
          body:  `${match.homeTeam} vs ${match.awayTeam} vient de commencer !`,
          url:   `/matchs/${match.id}`,
          tag:   `live-${match.id}`,
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[Cron syncLive] Erreur:', err.message);
  }
}

function startSyncMatchesCron() {
  cron.schedule('0 */12 * * *', () => {
    compCache.clear();
    const today = new Date().toISOString().split('T')[0];
    syncMatchesForDate(today);
  });

  cron.schedule('0 6 * * *', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    syncMatchesForDate(tomorrow.toISOString().split('T')[0]);
  });

  cron.schedule('*/5 * * * *', syncLiveMatches);

  console.log('[Cron] Synchronisation des matchs démarrée');

  const today = new Date().toISOString().split('T')[0];
  syncCache.delete(today);
  syncMatchesForDate(today).catch((e) => console.error('[Cron] Sync initiale:', e.message));
}

module.exports = { startSyncMatchesCron, syncMatchesForDate };
