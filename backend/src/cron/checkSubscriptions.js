// Cron : vérification des abonnements expirants / expirés
const cron = require('node-cron');
const prisma = require('../config/database');
const { sendSubscriptionExpiryReminder } = require('../services/emailService');

async function checkExpiringSubscriptions() {
  console.log('[Cron checkSubscriptions] Vérification des abonnements...');
  const now = new Date();

  // Notifications J-3, J-1, J0
  for (const daysLeft of [3, 1, 0]) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysLeft);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const subscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: targetDate, lt: nextDay },
      },
      include: {
        user: { include: { profile: true } },
        plan: true,
      },
    });

    for (const sub of subscriptions) {
      if (sub.user.profile?.notifEmail) {
        sendSubscriptionExpiryReminder(
          { ...sub.user, subscription: sub },
          daysLeft === 0 ? 'aujourd\'hui' : daysLeft
        ).catch(console.error);
      }
    }

    if (subscriptions.length > 0) {
      console.log(`[Cron checkSubscriptions] ${subscriptions.length} rappels envoyés (J-${daysLeft})`);
    }
  }

  // Passage en statut EXPIRED pour les abonnements arrivés à terme
  const expired = await prisma.subscription.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: { lt: now },
    },
    data: { status: 'EXPIRED' },
  });

  if (expired.count > 0) {
    console.log(`[Cron checkSubscriptions] ${expired.count} abonnements passés en EXPIRED`);
  }
}

function startCheckSubscriptionsCron() {
  // Tous les jours à 8h du matin
  cron.schedule('0 8 * * *', checkExpiringSubscriptions);
  console.log('[Cron] Vérification des abonnements démarrée');
}

module.exports = { startCheckSubscriptionsCron };
