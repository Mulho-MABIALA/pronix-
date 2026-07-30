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

// Icône de notification composée des deux logos (domicile + extérieur) —
// une notif push n'a qu'un seul slot "icon", donc on les fusionne côté
// serveur (voir routes/imgProxy.js) au lieu de ne montrer que le logo
// domicile comme avant.
function matchIconUrl(homeLogo, awayLogo) {
  if (!homeLogo) return '/logo192.png';
  const params = new URLSearchParams({ home: homeLogo });
  if (awayLogo) params.set('away', awayLogo);
  return `/api/img-proxy/match-icon?${params.toString()}`;
}

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

async function notifyTipResults(matchId, homeTeam, awayTeam, homeScore, awayScore, homeTeamLogo, awayTeamLogo) {
  try {
    const tips = await prisma.tip.findMany({
      where: { matchId, isVisible: true, userId: { not: null } },
      select: { id: true, userId: true, prediction: true },
    });
    if (tips.length === 0) return;

    const scoreStr = `${homeScore}-${awayScore}`;
    const icon = matchIconUrl(homeTeamLogo, awayTeamLogo);
    for (const tip of tips) {
      const won = evaluateTip(tip.prediction, homeScore, awayScore);
      if (won === null) continue;
      await notifyUser(tip.userId, {
        title: won ? '✅ Bon pronostic !' : '❌ Pronostic raté',
        body:  `${homeTeam} ${scoreStr} ${awayTeam} — ${PRED_LABELS[tip.prediction] || tip.prediction}`,
        url:   `/matchs/${matchId}`,
        tag:   `tipresult-${tip.id}`,
        icon,
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

    // Logo officiel API-Football (fourni dans le fixture, sinon déduit de l'ID)
    const logo = fixture.league?.logo
      || (/^\d+$/.test(leagueExternalId) ? `https://media.api-sports.io/football/leagues/${leagueExternalId}.png` : null);

    try {
      competition = await prisma.competition.create({
        data: { externalId: leagueExternalId, name, country, logo, isDisplayed: true },
      });
      console.log(`[Sync] Nouvelle compétition: ${name} (${country}) [${leagueExternalId}]`);
    } catch {
      // Race condition → re-fetch
      competition = await prisma.competition.findUnique({
        where: { externalId: leagueExternalId },
      });
    }
  } else if (!competition.logo && fixture.league?.logo) {
    // Backfill du logo pour les compétitions existantes
    competition = await prisma.competition.update({
      where: { id: competition.id },
      data: { logo: fixture.league.logo },
    }).catch(() => competition);
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

// Fenêtre de veille avant coup d'envoi — l'API (plan gratuit, 100 req/jour)
// ne peut pas se permettre un polling permanent toutes les 2-3 min. Avant ce
// correctif, syncLiveMatches ne tournait que toutes les 30 min en continu :
// un match pouvait passer LIVE dans l'API jusqu'à 30 min avant qu'on ne le
// détecte, d'où des notifs "le match commence" reçues alors que le match en
// était déjà à la 20e, voire la 50e minute (bug remonté par un utilisateur).
// Solution : on interroge notre propre base (gratuit) à chaque tick pour
// savoir si ça vaut le coup d'appeler l'API — un match déjà LIVE chez nous,
// ou prévu dans la fenêtre de coup d'envoi. Si rien à surveiller, on
// n'appelle pas l'API du tout : sur une journée sans match dans l'immédiat,
// ça peut même consommer MOINS de quota qu'avant, tout en étant bien plus
// réactif pendant les créneaux où ça compte.
const KICKOFF_WINDOW_BEFORE_MS = 10 * 60 * 1000; // matchs prévus dans les 10 prochaines minutes
const KICKOFF_WINDOW_AFTER_MS = 20 * 60 * 1000;  // ou dont le coup d'envoi programmé date de < 20 min (retard possible)

async function hasMatchesWorthPolling() {
  const now = new Date();
  const [liveCount, upcomingCount] = await Promise.all([
    prisma.match.count({ where: { status: 'LIVE' } }),
    prisma.match.count({
      where: {
        status: 'SCHEDULED',
        scheduledAt: {
          gte: new Date(now.getTime() - KICKOFF_WINDOW_AFTER_MS),
          lte: new Date(now.getTime() + KICKOFF_WINDOW_BEFORE_MS),
        },
      },
    }),
  ]);
  return liveCount > 0 || upcomingCount > 0;
}

async function syncLiveMatches() {
  try {
    if (!(await hasMatchesWorthPolling())) return;
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
          title: `🔴 ${match.homeTeam} vs ${match.awayTeam}`,
          body:  'Le match vient de commencer — suivez-le en direct !',
          url:   `/matchs/${match.id}`,
          tag:   `live-${match.id}`,
          icon:  matchIconUrl(match.homeTeamLogo, match.awayTeamLogo),
        }).catch(() => {});
      }

      // Fin de match : LIVE → FINISHED
      if (wasLive && normalized.status === 'FINISHED') {
        const hs = normalized.homeScore ?? 0;
        const as = normalized.awayScore ?? 0;

        // Broadcast résultat à tous
        broadcastNotification({
          title: `⚽ ${match.homeTeam} ${hs} - ${as} ${match.awayTeam}`,
          body:  'Match terminé — voir les stats et résultats des pronos.',
          url:   `/matchs/${match.id}`,
          tag:   `result-${match.id}`,
          icon:  matchIconUrl(match.homeTeamLogo, match.awayTeamLogo),
        }).catch(() => {});

        // Notification individuelle par tipster
        notifyTipResults(match.id, match.homeTeam, match.awayTeam, hs, as, match.homeTeamLogo, match.awayTeamLogo).catch(() => {});

        // Résumé post-match automatique (article de blog IA)
        generateMatchSummary(match.id).catch(() => {});
      }
    }
  } catch (err) {
    console.error('[Cron syncLive] Erreur:', err.message);
  }
}

// Marque comme CANCELLED les matchs restés SCHEDULED plus de 36h après leur date
// (matchs mockés ou disparus de l'API) — leurs pronos seront annulés (VOID)
async function cleanupStaleMatches() {
  try {
    const cutoff = new Date(Date.now() - 36 * 60 * 60 * 1000);
    const res = await prisma.match.updateMany({
      where: { status: 'SCHEDULED', scheduledAt: { lt: cutoff } },
      data:  { status: 'CANCELLED' },
    });
    if (res.count > 0) console.log(`[Cron cleanup] ${res.count} matchs obsolètes passés en CANCELLED`);
  } catch (err) {
    console.error('[Cron cleanup] Erreur:', err.message);
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

  // 3h30 : récupérer les scores finaux d'HIER (matchs terminés tard le soir)
  // → indispensable pour résoudre les pronostics et calculer les stats tipsters
  cron.schedule('30 3 * * *', async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    syncCache.delete(dateStr); // ignorer le cooldown
    await syncMatchesForDate(dateStr);
    await cleanupStaleMatches();
  });

  // Toutes les 2 min : le coût réel (l'appel API) ne se déclenche que si
  // hasMatchesWorthPolling() répond oui — voir le commentaire au-dessus de
  // cette fonction pour le raisonnement quota.
  cron.schedule('*/2 * * * *', syncLiveMatches);

  console.log('[Cron] Synchronisation des matchs démarrée');

  const today = new Date().toISOString().split('T')[0];
  syncCache.delete(today);
  syncMatchesForDate(today).catch((e) => console.error('[Cron] Sync initiale:', e.message));
}

module.exports = { startSyncMatchesCron, syncMatchesForDate, cleanupStaleMatches };
