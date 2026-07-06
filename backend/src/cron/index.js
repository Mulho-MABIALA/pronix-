const cron = require('node-cron');
const { startSyncMatchesCron } = require('./syncMatches');
const { startUpdateStatsCron } = require('./updateTipsterStats');
const { startCheckSubscriptionsCron } = require('./checkSubscriptions');
const { startAgentsCron } = require('./runAgents');
const { syncOdds } = require('../services/oddsService');

function startAllCronJobs() {
  startSyncMatchesCron();
  startUpdateStatsCron();
  startCheckSubscriptionsCron();

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

  console.log('[Cron] Tous les jobs planifiés démarrés');
}

module.exports = { startAllCronJobs };
