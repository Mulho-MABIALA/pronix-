// Cron : résolution des pronostics et recalcul des stats tipsters
const cron = require('node-cron');
const prisma = require('../config/database');
const { resolveTipsForMatch, voidTipsForCancelledMatches, recalculateAllTipsterStats } = require('../services/tipsterStatsService');

async function resolvePendingTips() {
  console.log('[Cron updateStats] Résolution des pronostics en attente...');

  // 1. Annuler les tips des matchs annulés/reportés
  const voided = await voidTipsForCancelledMatches();

  // 2. Résoudre les tips des matchs terminés
  const finishedMatches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      tips: { some: { result: null } },
    },
  });

  for (const match of finishedMatches) {
    await resolveTipsForMatch(match.id);
  }

  // 3. Recalculer les stats si quelque chose a changé
  if (finishedMatches.length > 0 || voided > 0) {
    await recalculateAllTipsterStats();
  }
}

function startUpdateStatsCron() {
  // Toutes les 30 minutes — résolution des pronostics + recalcul des stats
  cron.schedule('*/30 * * * *', resolvePendingTips);

  // Recalcul complet chaque nuit à minuit
  cron.schedule('0 0 * * *', recalculateAllTipsterStats);

  console.log('[Cron] Mise à jour des statistiques tipsters démarrée');
}

module.exports = { startUpdateStatsCron };
