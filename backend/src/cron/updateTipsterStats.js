// Cron : résolution des pronostics et recalcul des stats tipsters
const cron = require('node-cron');
const prisma = require('../config/database');
const { resolveTipsForMatch, voidTipsForCancelledMatches, recalculateAllTipsterStats } = require('../services/tipsterStatsService');

// Sans le try/catch (ici + autour de chaque match dans la boucle), une
// erreur unique faisait disparaître ce cron silencieusement — plus aucune
// résolution de pronostic ni recalcul de stats tipster jusqu'au redémarrage
// du process, sans aucun log. Voir aussi checkSubscriptions.js (même souci).
async function resolvePendingTips() {
  try {
    await resolvePendingTipsUnsafe();
  } catch (err) {
    console.error('[Cron updateStats] Erreur resolvePendingTips:', err.message);
  }
}

async function resolvePendingTipsUnsafe() {
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
    try {
      await resolveTipsForMatch(match.id);
    } catch (err) {
      // Un match qui plante ne doit pas empêcher la résolution des autres.
      console.error(`[Cron updateStats] resolveTipsForMatch(${match.id}):`, err.message);
    }
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
  cron.schedule('0 0 * * *', () => {
    recalculateAllTipsterStats().catch((err) => {
      console.error('[Cron updateStats] Erreur recalculateAllTipsterStats (minuit):', err.message);
    });
  });

  console.log('[Cron] Mise à jour des statistiques tipsters démarrée');
}

module.exports = { startUpdateStatsCron };
