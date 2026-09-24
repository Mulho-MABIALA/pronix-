const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { isSubscriptionLive } = require('../middleware/subscription');

// ─── Tous les plans ────────────────────────────────────────────────────────────
async function getPlans(req, res, next) {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ success: true, data: plans });
  } catch (err) {
    next(err);
  }
}

// ─── Abonnement actuel de l'utilisateur ───────────────────────────────────────
async function getMySubscription(req, res, next) {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: req.user.id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new AppError('Aucun abonnement trouvé', 404, 'NOT_FOUND');
    }

    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [payments, dailyPassesLast7Days] = await Promise.all([
      prisma.payment.findMany({
        where: { userId: req.user.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Nombre de Pass Jour payés sur 7 jours glissants — sert à suggérer
      // l'abonnement hebdo quand il devient plus avantageux (Subscription.jsx),
      // et de garde-fou jeu responsable contre les achats impulsifs répétés.
      prisma.payment.count({
        where: {
          userId: req.user.id,
          status: 'COMPLETED',
          createdAt: { gte: weekAgo },
          metadata: { path: ['billingCycle'], equals: 'DAILY' },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        subscription,
        payments,
        dailyPassesLast7Days,
        isLive: isSubscriptionLive(subscription),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPlans, getMySubscription };
