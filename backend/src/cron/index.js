const { startSyncMatchesCron } = require('./syncMatches');
const { startUpdateStatsCron } = require('./updateTipsterStats');
const { startCheckSubscriptionsCron } = require('./checkSubscriptions');
const { startAgentsCron } = require('./runAgents');

function startAllCronJobs() {
  startSyncMatchesCron();
  startUpdateStatsCron();
  startCheckSubscriptionsCron();
  if (process.env.ANTHROPIC_API_KEY) {
    startAgentsCron();
  }
  console.log('[Cron] Tous les jobs planifiés démarrés');
}

module.exports = { startAllCronJobs };
