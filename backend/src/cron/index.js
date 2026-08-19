const cron = require('node-cron');
const prisma = require('../config/database');
const { startSyncMatchesCron } = require('./syncMatches');
const { startUpdateStatsCron } = require('./updateTipsterStats');
const { startCheckSubscriptionsCron } = require('./checkSubscriptions');
const { startMatchRemindersCron } = require('./matchReminders');
const { startAgentsCron } = require('./runAgents');
const { syncOdds } = require('../services/oddsService');
const { broadcastNotification } = require('../controllers/pushController');
const { generateDailyTips } = require('../services/aiTipsterService');
const { refreshRates } = require('../services/currencyService');

function startAllCronJobs() {
  startSyncMatchesCron();
  startUpdateStatsCron();
  startCheckSubscriptionsCron();
  startMatchRemindersCron();

  if (process.env.ANTHROPIC_API_KEY) {
    startAgentsCron();
  }

  // Cotes The Odds API : sync au démarrage + chaque jour à 11h00
  if (process.env.ODDS_API_KEY) {
    syncOdds().catch((e) => console.error('[Odds] Sync initiale échouée:', e.message));
    cron.schedule('0 11 * * *', () => {
      syncOdds().catch((e) => console.error('[Odds] Sync cron échouée:', e.message));
    });
    console.log('[Cron] The Odds API — sync planifiée à 11h00 quotidien');
  }

  // ── Tipster IA — génération des pronostics quotidiens à 8h00 ─────────────
  if (process.env.ANTHROPIC_API_KEY) {
    cron.schedule('0 8 * * *', () => {
      generateDailyTips().catch((e) => console.error('[AITipster] Cron échoué:', e.message));
    });
    // Génère aussi au démarrage si aucun pronostic IA pour aujourd'hui
    generateDailyTips().catch((e) => console.error('[AITipster] Init échouée:', e.message));
    console.log('[Cron] Tipster IA planifié à 8h00 quotidien');
  }

  // ── Digest matinal à 7h30 ────────────────────────────────────────────────
  cron.schedule('30 7 * * *', async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const matchCount = await prisma.match.count({
        where: {
          scheduledAt: { gte: today, lt: tomorrow },
          status: 'SCHEDULED',
        },
      });

      if (matchCount === 0) return;

      await broadcastNotification({
        title: `☀️ Bon matin ! ${matchCount} match${matchCount > 1 ? 's' : ''} aujourd'hui`,
        body:  'Consultez les pronostics et préparez vos mises pour la journée.',
        url:   '/matchs',
        tag:   'morning-digest',
        icon:  '/logo192.png',
      });

      console.log(`[Cron digest] Digest matinal envoyé — ${matchCount} matchs`);
    } catch (e) {
      console.error('[Cron digest] Erreur:', e.message);
    }
  });
  console.log('[Cron] Digest matinal planifié à 7h30');

  // ── Taux de change FCFA → devises (affichage indicatif) — 1×/jour ─────────
  refreshRates().catch((e) => console.error('[Currency] Sync initiale échouée:', e.message));
  cron.schedule('0 5 * * *', () => {
    refreshRates().catch((e) => console.error('[Currency] Sync cron échouée:', e.message));
  });
  console.log('[Cron] Taux de change — sync planifiée à 05h00 quotidien');

  console.log('[Cron] Tous les jobs planifiés démarrés');
}

module.exports = { startAllCronJobs };
