// Cron : synchronisation des matchs depuis API-Football (api-sports.io)
const cron = require('node-cron');
const prisma = require('../config/database');
const footballApi = require('../services/footballApi');
const { broadcastNotification, notifyUser } = require('../controllers/pushController');
const { calculatePredictionsForDate } = require('../services/predictionService');
const { generateMatchSummary } = require('../services/matchSummaryService');

// ─── Évaluation d'un pronostic vs score final ─────────────────────────────────
const PRED_LABELS = {
  HOME_WIN:  'Victoire domicile',
  DRAW:      'Match nul',
  AWAY_WIN:  'Victoire extérieure',
  OVER_2_5:  'Plus de 2.5 buts',
  UNDER_2_5: 'Moins de 2.5 buts',
  BTTS_YES:  'Les deux équipes marquent',
  BTTS_NO:   "Au moins une équipe ne marque pas",
};

function evaluateTip(prediction, homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;
  const total = homeScore + awayScore;
  switch (prediction) {
    case 'HOME_WIN':  return homeScore > awayScore;
    case 'DRAW':      return homeScore === awayScore;
    case 'AWAY_WIN':  return awayScore > homeScore;
    case 'OVER_2_5':  return total > 2;
    case 'UNDER_2_5': return total < 3;
    case 'BTTS_YES':  return homeScore > 0 && awayScore > 0;
    case 'BTTS_NO':   return homeScore === 0 || awayScore === 0;
    default:          return null;
  }
}

async function notifyTipResults(matchId, homeTeam, awayTeam, homeScore, awayScore) {
  try {
    const tips = await prisma.tip.findMany({
      where: { matchId, isVisible: true, userId: { not: null } },
      select: { id: true, userId: true, prediction: true },
    });
    if (tips.length === 0) return;

    const scoreStr = `${homeScore}-${awayScore}`;
    for (const tip of tips) {
      const won = evaluateTip(tip.prediction, homeScore, awayScore);
      if (won === null) continue;
      await notifyUser(tip.userId, {
        title: won ? '✅ Bon pronostic !' : '❌ Pronostic raté',
        body:  `${homeTeam} ${scoreStr} ${awayTeam} — ${PRED_LABELS[tip.prediction] || tip.prediction}`,
        url:   `/matchs/${matchId}`,
        tag:   `tipresult-${tip.id}`,
      });
    }
  } catch (err) {
    console.error('[Cron syncLive] notifyTipResults:', err.message);
  }
}

// Cache des dates déjà synchronisées (protection quota api-sports)
const syncCache = new Map();
const SYNC_COOLDOWN_MS = 15 * 60 * 1000;

function isCoolingDown(dateStr) {
  const last = syncCache.get(dateStr);
  return last && Date.now() - last < SYNC_COOLDOWN_MS;
}

// Cache local compétition : évite N requêtes DB par sync (externalId → Competition)
const compCache = new Map();

// Pour API-Football, l'ID de ligue est stable — pas besoin de mapping spécifique
function resolveLeagueId(rawLeagueId) {
  return rawLeagueId;
}

// Trouve ou crée dynamiquement une compétition depuis les données du match
async function findOrCreateCompetition(fixture, leagueExternalId) {
  if (compCache.has(leagueExternalId)) return compCache.get(leagueExternalId);

  let competition = await prisma.competition.findUnique({
    where: { externalId: leagueExternalId },
  });

  if (!competition) {
    // Format API-Football : fixture.league.name / fixture.league.country
    const name = fixture.league?.name
      || fixture.competition?.name
      || null;

    const country = fixture.league?.country
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
      // Format API-Football : fixture.league.id
      const rawLeagueId = String(fixture.league?.id || fixture.competition?.id || '');
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
      // Format API-Football : fixture.fixture.id
      const externalId = String(fixture.fixture?.id || fixture.id || '');
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

      // Fin de match : LIVE → FINISHED
      if (wasLive && normalized.status === 'FINISHED') {
        const hs = normalized.homeScore ?? 0;
        const as = normalized.awayScore ?? 0;

        // Broadcast résultat à tous
        broadcastNotification({
          title: `⚽ Résultat : ${match.homeTeam} ${hs}-${as} ${match.awayTeam}`,
          body:  'Le match est terminé.',
          url:   `/matchs/${match.id}`,
          tag:   `result-${match.id}`,
        }).catch(() => {});

        // Notification individuelle par tipster
        notifyTipResults(match.id, match.homeTeam, match.awayTeam, hs, as).catch(() => {});

        // Résumé post-match automatique (article de blog IA)
        generateMatchSummary(match.id).catch(() => {});
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

  cron.schedule('*/30 * * * *', syncLiveMatches);

  console.log('[Cron] Synchronisation des matchs démarrée');

  const today = new Date().toISOString().split('T')[0];
  syncCache.delete(today);
  syncMatchesForDate(today).catch((e) => console.error('[Cron] Sync initiale:', e.message));
}

module.exports = { startSyncMatchesCron, syncMatchesForDate };
