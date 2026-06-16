const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

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

    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    res.json({ success: true, data: { subscription, payments } });
  } catch (err) {
    next(err);
  }
}

module.exports = { getPlans, getMySubscription };
