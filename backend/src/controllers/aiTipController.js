const { z } = require('zod');
const prisma = require('../config/database');
const { generateMatchPrediction } = require('../services/claudeService');
const footballApi = require('../services/footballApi');
const { AppError } = require('../middleware/errorHandler');
const { getUserPlanCode } = require('../middleware/subscription');

// Quota stocké en PostgreSQL → partagé entre tous les workers PM2 cluster
// (l'ancien Map() en mémoire ne l'était pas : chaque worker avait son propre
// compteur, donc la vraie limite effective était bien plus haute que prévu,
// et tout repartait à zéro à chaque redéploiement).
//
// La route POST /tips/generate-ai exige déjà requirePlan('PREMIUM') — seuls
// les comptes PREMIUM/PRO/LIFETIME (ou en essai gratuit) atteignent ce code.
// seed.js promet "Pronostics IA illimités" à ces utilisateurs : on applique
// donc le même principe que chatService.checkAndIncrementQuota — illimité
// pour ces plans, avec un filet de sécurité FREE au cas où (défense en
// profondeur si jamais la route change).
const FREE_DAILY_LIMIT = 5;

function today() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

async function checkAndIncrementQuota(userId, isPremium) {
  if (isPremium) return { allowed: true, used: null, limit: null };

  const date = today();

  const quota = await prisma.aiTipQuota.upsert({
    where:  { userId_date: { userId, date } },
    create: { userId, date, count: 1 },
    update: { count: { increment: 1 } },
  });

  if (quota.count > FREE_DAILY_LIMIT) {
    await prisma.aiTipQuota.update({
      where: { userId_date: { userId, date } },
      data:  { count: { decrement: 1 } },
    });
    return { allowed: false, used: FREE_DAILY_LIMIT, limit: FREE_DAILY_LIMIT };
  }

  return { allowed: true, used: quota.count, limit: FREE_DAILY_LIMIT };
}

function getResult(m, teamName) {
  if (m.homeScore === null || m.awayScore === null) return null;
  const isHome = m.homeTeam === teamName;
  if (m.homeScore === m.awayScore) return 'D';
  const homeWon = m.homeScore > m.awayScore;
  return (isHome ? homeWon : !homeWon) ? 'W' : 'L';
}

async function generateAiTip(req, res, next) {
  try {
    const { matchId } = z.object({ matchId: z.string().uuid('matchId invalide') }).parse(req.body);

    // Vérif + incrémentation atomique du quota journalier en DB
    const isPremium = ['PREMIUM', 'PRO', 'LIFETIME'].includes(getUserPlanCode(req.user));
    const quota = await checkAndIncrementQuota(req.user.id, isPremium);
    if (!quota.allowed) {
      throw new AppError(
        `Limite atteinte : ${FREE_DAILY_LIMIT} analyses IA par jour maximum`,
        429,
        'DAILY_LIMIT_EXCEEDED'
      );
    }

    // Récupère le match
    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { competition: true },
    });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');
    if (match.status !== 'SCHEDULED') {
      throw new AppError('Ce match a déjà commencé ou est terminé', 400, 'INVALID_MATCH_STATUS');
    }

    // Récupère forme + H2H depuis la DB
    const [homeMatches, awayMatches, h2hMatches] = await Promise.all([
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          OR: [{ homeTeam: match.homeTeam }, { awayTeam: match.homeTeam }],
          NOT: { id: match.id },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          OR: [{ homeTeam: match.awayTeam }, { awayTeam: match.awayTeam }],
          NOT: { id: match.id },
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
      prisma.match.findMany({
        where: {
          status: 'FINISHED',
          OR: [
            { homeTeam: match.homeTeam, awayTeam: match.awayTeam },
            { homeTeam: match.awayTeam, awayTeam: match.homeTeam },
          ],
        },
        orderBy: { scheduledAt: 'desc' },
        take: 5,
      }),
    ]);

    const homeFormLocal = homeMatches.map((m) => ({ ...m, result: getResult(m, match.homeTeam) }));
    const awayFormLocal = awayMatches.map((m) => ({ ...m, result: getResult(m, match.awayTeam) }));

    // Enrichissement API-Football si clé disponible
    const hasExternalId = match.externalId && !String(match.externalId).startsWith('mock');
    let apiHomeForm = null, apiAwayForm = null, apiH2h = null, injuries = null;

    if (hasExternalId && match.homeTeamId && match.awayTeamId) {
      const results = await Promise.allSettled([
        footballApi.getTeamRecentForm(match.homeTeamId, 5),
        footballApi.getTeamRecentForm(match.awayTeamId, 5),
        footballApi.getHeadToHead(match.homeTeamId, match.awayTeamId, 10),
        footballApi.getInjuries(match.externalId),
      ]);
      apiHomeForm = results[0].status === 'fulfilled' ? results[0].value : null;
      apiAwayForm = results[1].status === 'fulfilled' ? results[1].value : null;
      apiH2h     = results[2].status === 'fulfilled' ? results[2].value : null;
      injuries   = results[3].status === 'fulfilled' ? results[3].value : null;
    }

    // Utiliser les données API si disponibles, sinon fallback DB locale
    const homeForm = apiHomeForm?.length ? apiHomeForm.map(m => ({ ...m, result: getResult(m, match.homeTeam) })) : homeFormLocal;
    const awayForm = apiAwayForm?.length ? apiAwayForm.map(m => ({ ...m, result: getResult(m, match.awayTeam) })) : awayFormLocal;
    const h2h = apiH2h?.length ? apiH2h : h2hMatches;

    // Appel Claude avec données enrichies
    const prediction = await generateMatchPrediction({
      match,
      homeForm,
      awayForm,
      h2h,
      injuries,
    });

    res.json({
      success: true,
      data: prediction,
      meta: isPremium
        ? { usedToday: null, dailyLimit: null, unlimited: true }
        : { usedToday: quota.used, dailyLimit: FREE_DAILY_LIMIT, unlimited: false },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { generateAiTip };
