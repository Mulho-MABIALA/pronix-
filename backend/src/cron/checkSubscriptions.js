// Cron : vérification des abonnements expirants / expirés
const cron = require('node-cron');
const prisma = require('../config/database');
const { sendSubscriptionExpiryReminder } = require('../services/emailService');
const { notifyUser } = require('../controllers/pushController');

async function checkExpiringSubscriptions() {
  try {
    await checkExpiringSubscriptionsUnsafe();
  } catch (err) {
    // Sans ce try/catch, une erreur ici (ex: DB momentanément indisponible)
    // faisait disparaître silencieusement ce cron — aucun log, aucune alerte
    // — et donc plus aucun rappel d'expiration ni passage EXPIRED tant que le
    // process n'était pas redémarré. node-cron catch bien la rejection en
    // interne mais aucun listener 'task-failed' n'est enregistré ailleurs
    // dans le code, donc rien n'était jamais visible.
    console.error('[Cron checkSubscriptions] Erreur:', err.message);
  }
}

async function checkExpiringSubscriptionsUnsafe() {
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

      // Push notification (J-3 et J-1 uniquement, pas J0 pour éviter le doublon avec l'email)
      if (daysLeft > 0) {
        notifyUser(sub.user.id, {
          title: `⚠️ Abonnement expirant dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
          body:  `Renouvelez votre abonnement ${sub.plan?.displayName || 'Premium'} pour continuer à profiter de tous les avantages.`,
          url:   '/abonnement',
          tag:   `sub-expiry-${sub.id}`,
        }).catch(console.error);
      }
    }

    if (subscriptions.length > 0) {
      console.log(`[Cron checkSubscriptions] ${subscriptions.length} rappels envoyés (J-${daysLeft})`);
    }
  }

  // ── Rappels de fin d'essai gratuit 7 jours (J-2, J-1, J0) ──────────────────
  for (const daysLeft of [2, 1, 0]) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + daysLeft);
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Utilisateurs dont l'essai se termine ce jour-là, sans abonnement payant actif
    const trialUsers = await prisma.user.findMany({
      where: {
        trialEndsAt: { gte: targetDate, lt: nextDay },
        isActive: true,
        subscription: {
          OR: [
            { status: { not: 'ACTIVE' } },
            { plan: { code: 'FREE' } },
          ],
        },
      },
      select: { id: true },
    });

    for (const u of trialUsers) {
      const payload = daysLeft > 0
        ? {
            title: `⏳ Ton essai gratuit se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`,
            body:  'Passe à Premium pour garder l\'accès aux pronostics illimités, stats avancées et analyses IA.',
            url:   '/abonnement',
            tag:   `trial-reminder-${daysLeft}`,
          }
        : {
            title: '🔒 Ton essai gratuit est terminé',
            body:  'Abonne-toi à Premium pour retrouver tous tes avantages : pronos illimités, stats et IA.',
            url:   '/abonnement',
            tag:   'trial-ended',
          };
      notifyUser(u.id, payload).catch(console.error);
    }

    if (trialUsers.length > 0) {
      console.log(`[Cron checkSubscriptions] ${trialUsers.length} rappels fin d'essai (J-${daysLeft})`);
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
