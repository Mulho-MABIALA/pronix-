const { startSyncMatchesCron } = require('./syncMatches');
const { startUpdateStatsCron } = require('./updateTipsterStats');
const { startCheckSubscriptionsCron } = require('./checkSubscriptions');

function startAllCronJobs() {
  startSyncMatchesCron();
  startUpdateStatsCron();
  startCheckSubscriptionsCron();
  console.log('[Cron] Tous les jobs planifiés démarrés');
}

module.exports = { startAllCronJobs };
