const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const planSchema = z.object({
  name:        z.string().min(3).max(100).default('Plan Premium'),
  description: z.string().max(500).optional(),
  price:       z.number().int().min(100).max(100000), // FCFA
  isActive:    z.boolean().default(true),
});

// ─── Tipster : créer / mettre à jour son plan ─────────────────────────────────
// POST /tipster-plans — req.user doit avoir tipsterStats (sinon pas tipster)
async function upsertPlan(req, res, next) {
  try {
    const data = planSchema.parse(req.body);

    // Vérifier que l'utilisateur est bien tipster (a des stats)
    const stats = await prisma.tipsterStats.findUnique({ where: { userId: req.user.id } });
    if (!stats && req.user.role !== 'ADMIN') {
      throw new AppError('Réservé aux tipsters actifs', 403, 'FORBIDDEN');
    }

    const plan = await prisma.tipsterPlan.upsert({
      where:  { tipsterId: req.user.id },
      update: data,
      create: { ...data, tipsterId: req.user.id },
    });

    res.json({ success: true, data: plan });
  } catch (err) { next(err); }
}

// GET /tipster-plans/:tipsterId — plan d'un tipster (public)
async function getPlan(req, res, next) {
  try {
    const plan = await prisma.tipsterPlan.findUnique({
      where: { tipsterId: req.params.tipsterId },
      include: {
        tipster: {
          select: {
            username: true,
            profile: { select: { displayName: true, avatar: true } },
            tipsterStats: true,
          },
        },
      },
    });

    if (!plan || !plan.isActive) throw new AppError('Plan introuvable', 404, 'NOT_FOUND');

    // Compter les abonnés actifs
    const subscriberCount = await prisma.tipsterSubscription.count({
      where: { planId: plan.id, status: 'ACTIVE' },
    });

    res.json({ success: true, data: { ...plan, subscriberCount } });
  } catch (err) { next(err); }
}

// POST /tipster-plans/:tipsterId/subscribe — octroi manuel (ADMIN uniquement)
// Le flux payant normal passe par POST /payments/tipster/geniuspay/init — cet
// endpoint reste pour un octroi manuel exceptionnel (support, geste commercial).
async function subscribe(req, res, next) {
  try {
    if (req.user.role !== 'ADMIN') {
      throw new AppError('Utilisez le paiement Geniuspay pour vous abonner à un tipster', 403, 'PAYMENT_REQUIRED');
    }

    const { tipsterId } = req.params;
    if (tipsterId === req.user.id) {
      throw new AppError('Vous ne pouvez pas vous abonner à vous-même', 400, 'SELF_SUBSCRIBE');
    }

    const plan = await prisma.tipsterPlan.findUnique({ where: { tipsterId } });
    if (!plan || !plan.isActive) throw new AppError('Plan introuvable', 404, 'NOT_FOUND');

    // Vérifier si déjà abonné
    const existing = await prisma.tipsterSubscription.findUnique({
      where: { subscriberId_planId: { subscriberId: req.user.id, planId: plan.id } },
    });

    if (existing && existing.status === 'ACTIVE') {
      throw new AppError('Déjà abonné à ce tipster', 409, 'ALREADY_SUBSCRIBED');
    }

    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = existing
      ? await prisma.tipsterSubscription.update({
          where: { id: existing.id },
          data: { status: 'ACTIVE', startDate: new Date(), endDate },
        })
      : await prisma.tipsterSubscription.create({
          data: {
            subscriberId: req.user.id,
            planId: plan.id,
            status: 'ACTIVE',
            endDate,
          },
        });

    res.status(201).json({ success: true, data: sub });
  } catch (err) { next(err); }
}

// DELETE /tipster-plans/:tipsterId/subscribe — se désabonner
async function unsubscribe(req, res, next) {
  try {
    const { tipsterId } = req.params;

    const plan = await prisma.tipsterPlan.findUnique({ where: { tipsterId } });
    if (!plan) throw new AppError('Plan introuvable', 404, 'NOT_FOUND');

    const sub = await prisma.tipsterSubscription.findUnique({
      where: { subscriberId_planId: { subscriberId: req.user.id, planId: plan.id } },
    });
    if (!sub || sub.status !== 'ACTIVE') {
      throw new AppError('Pas d\'abonnement actif à ce tipster', 404, 'NOT_FOUND');
    }

    await prisma.tipsterSubscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    });

    res.json({ success: true, message: 'Désabonnement effectué' });
  } catch (err) { next(err); }
}

// GET /tipster-plans/mine/subscribers — liste des abonnés (tipster uniquement)
async function listSubscribers(req, res, next) {
  try {
    const plan = await prisma.tipsterPlan.findUnique({ where: { tipsterId: req.user.id } });
    if (!plan) throw new AppError('Vous n\'avez pas de plan actif', 404, 'NOT_FOUND');

    const subs = await prisma.tipsterSubscription.findMany({
      where: { planId: plan.id, status: 'ACTIVE' },
      include: {
        subscriber: {
          select: {
            username: true,
            profile: { select: { displayName: true, avatar: true } },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    res.json({ success: true, data: subs, total: subs.length });
  } catch (err) { next(err); }
}

// GET /tipster-plans/mine/status — vérifier si connecté est abonné à un tipster
async function checkSubscription(req, res, next) {
  try {
    const { tipsterId } = req.query;
    if (!tipsterId) throw new AppError('tipsterId requis', 400, 'MISSING_PARAM');

    const plan = await prisma.tipsterPlan.findUnique({ where: { tipsterId } });
    if (!plan) return res.json({ success: true, subscribed: false });

    const sub = await prisma.tipsterSubscription.findUnique({
      where: { subscriberId_planId: { subscriberId: req.user.id, planId: plan.id } },
    });

    const subscribed = sub?.status === 'ACTIVE' && (!sub.endDate || sub.endDate > new Date());
    res.json({ success: true, subscribed, sub: subscribed ? sub : null });
  } catch (err) { next(err); }
}

module.exports = { upsertPlan, getPlan, subscribe, unsubscribe, listSubscribers, checkSubscription };
