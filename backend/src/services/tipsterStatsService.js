// Service de calcul automatique des statistiques tipsters
const prisma = require('../config/database');

// Calcule le résultat d'un pronostic selon le score final
function computeTipResult(prediction, homeScore, awayScore) {
  if (homeScore === null || awayScore === null) return null;

  const diff = homeScore - awayScore;
  switch (prediction) {
    case 'HOME_WIN': return diff > 0 ? 'WIN' : 'LOSS';
    case 'DRAW':     return diff === 0 ? 'WIN' : 'LOSS';
    case 'AWAY_WIN': return diff < 0 ? 'WIN' : 'LOSS';
    case 'OVER_2_5': return (homeScore + awayScore) > 2.5 ? 'WIN' : 'LOSS';
    case 'UNDER_2_5': return (homeScore + awayScore) < 2.5 ? 'WIN' : 'LOSS';
    case 'BTTS_YES': return homeScore > 0 && awayScore > 0 ? 'WIN' : 'LOSS';
    case 'BTTS_NO':  return !(homeScore > 0 && awayScore > 0) ? 'WIN' : 'LOSS';
    default: return null;
  }
}

// Met à jour les résultats des pronostics pour un match terminé
async function resolveTipsForMatch(matchId) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== 'FINISHED') return;
  if (match.homeScore === null || match.awayScore === null) return;

  const tips = await prisma.tip.findMany({
    where: { matchId, result: null },
  });

  for (const tip of tips) {
    const result = computeTipResult(tip.prediction, match.homeScore, match.awayScore);
    if (result) {
      await prisma.tip.update({ where: { id: tip.id }, data: { result } });
    }
  }

  console.log(`[TipsterStats] ${tips.length} pronostics résolus pour le match ${matchId}`);
}

// Annule les pronostics des matchs annulés ou reportés (VOID = ne compte pas)
async function voidTipsForCancelledMatches() {
  const cancelledMatches = await prisma.match.findMany({
    where: {
      status: { in: ['CANCELLED', 'POSTPONED'] },
      tips: { some: { result: null } },
    },
    select: { id: true, homeTeam: true, awayTeam: true },
  });

  let totalVoided = 0;
  for (const match of cancelledMatches) {
    const { count } = await prisma.tip.updateMany({
      where: { matchId: match.id, result: null },
      data: { result: 'VOID' },
    });
    if (count > 0) {
      console.log(`[TipsterStats] ${count} pronostics annulés (VOID) — ${match.homeTeam} vs ${match.awayTeam}`);
      totalVoided += count;
    }
  }

  return totalVoided;
}

// Recalcule les statistiques globales et mensuelles pour tous les tipsters
async function recalculateAllTipsterStats() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const tipstersWithTips = await prisma.tip.groupBy({
    by: ['userId'],
    where: { result: { not: null } },
  });

  for (const { userId } of tipstersWithTips) {
    const [allTips, monthlyTips] = await Promise.all([
      prisma.tip.findMany({
        where: { userId, result: { not: null } },
        select: { result: true },
      }),
      prisma.tip.findMany({
        where: { userId, result: { not: null }, createdAt: { gte: firstDayOfMonth } },
        select: { result: true },
      }),
    ]);

    // VOID exclus du calcul (match annulé/reporté — ne pénalise pas le tipster)
    const counted = allTips.filter((t) => t.result !== 'VOID');
    const totalTips = counted.length;
    const correctTips = counted.filter((t) => t.result === 'WIN').length;
    const successRate = totalTips > 0 ? (correctTips / totalTips) * 100 : 0;

    const countedMonthly = monthlyTips.filter((t) => t.result !== 'VOID');
    const monthlyTotal = countedMonthly.length;
    const monthlyCorrect = countedMonthly.filter((t) => t.result === 'WIN').length;
    const monthlyRate = monthlyTotal > 0 ? (monthlyCorrect / monthlyTotal) * 100 : 0;

    await prisma.tipsterStats.upsert({
      where: { userId },
      update: { totalTips, correctTips, successRate, monthlyTips: monthlyTotal, monthlyCorrect, monthlyRate, lastCalculated: now },
      create: { userId, totalTips, correctTips, successRate, monthlyTips: monthlyTotal, monthlyCorrect, monthlyRate },
    });
  }

  // Mise à jour du classement global
  const allStats = await prisma.tipsterStats.findMany({
    where: { totalTips: { gte: 1 } },
    orderBy: [{ successRate: 'desc' }, { totalTips: 'desc' }],
  });

  for (let i = 0; i < allStats.length; i++) {
    await prisma.tipsterStats.update({
      where: { id: allStats[i].id },
      data: { globalRank: i + 1 },
    });
  }

  // Classement mensuel
  const monthlyStats = await prisma.tipsterStats.findMany({
    where: { monthlyTips: { gte: 1 } },
    orderBy: [{ monthlyRate: 'desc' }, { monthlyTips: 'desc' }],
  });

  for (let i = 0; i < monthlyStats.length; i++) {
    const stat = monthlyStats[i];
    const badges = [...(stat.badges || [])];

    if (i === 0 && !badges.includes('TOP_MOIS')) badges.push('TOP_MOIS');
    if (i < 10 && !badges.includes('TOP_10')) badges.push('TOP_10');

    await prisma.tipsterStats.update({
      where: { id: stat.id },
      data: { monthlyRank: i + 1, badges },
    });
  }

  console.log(`[TipsterStats] Statistiques recalculées pour ${tipstersWithTips.length} tipsters`);
}

module.exports = { resolveTipsForMatch, voidTipsForCancelledMatches, recalculateAllTipsterStats, computeTipResult };
