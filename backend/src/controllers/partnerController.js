// Programme Partenaires (influenceurs) — partenariat à la performance.
// Un influenceur reçoit un code unique ; quand quelqu'un s'abonne (paiement réel)
// après être passé par ce code, l'admin lui doit une commission en FCFA calculée
// automatiquement (commissionRate × montant du paiement). Le versement reste
// manuel (Mobile Money) : ce module se contente de calculer et tracer ce qui est dû.
const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// ─── Attribution à l'inscription (utilisateur connecté) ──────────────────────
// POST /api/partners/use/:code — appelé juste après l'inscription (best-effort,
// silencieux si code invalide/déjà attribué — ne doit jamais bloquer le signup).
async function usePartnerCode(req, res, next) {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse({ code: req.params.code });

    const existing = await prisma.partnerConversion.findUnique({ where: { userId: req.user.id } });
    if (existing) {
      throw new AppError('Un partenaire est déjà associé à ce compte', 400, 'ALREADY_ATTRIBUTED');
    }

    const partner = await prisma.partner.findUnique({ where: { code: code.toUpperCase() } });
    if (!partner || !partner.active) {
      throw new AppError('Code partenaire invalide', 404, 'INVALID_CODE');
    }

    const conversion = await prisma.partnerConversion.create({
      data: { partnerId: partner.id, userId: req.user.id },
    });

    res.status(201).json({ success: true, data: conversion });
  } catch (err) { next(err); }
}

// ─── Commission automatique à chaque paiement confirmé ────────────────────────
// Appelé depuis activateSubscription() (paymentController.js), fire-and-forget,
// juste après grantReferralReward(). Ne fait rien si l'utilisateur n'est venu
// via aucun code partenaire.
async function grantPartnerCommission(userId, paymentId) {
  try {
    const conversion = await prisma.partnerConversion.findUnique({
      where: { userId },
      include: { partner: true },
    });
    if (!conversion || !conversion.partner.active) return;

    // Idempotent : un paiement ne génère qu'une seule commission
    const already = await prisma.partnerCommission.findUnique({ where: { paymentId } });
    if (already) return;

    const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (!payment) return;

    const commissionAmount = Math.round(payment.amount * conversion.partner.commissionRate * 100) / 100;

    await prisma.partnerCommission.create({
      data: {
        conversionId: conversion.id,
        paymentId,
        amount: payment.amount,
        commissionAmount,
      },
    });
  } catch (err) {
    // Ne jamais faire échouer l'activation d'abonnement à cause d'un bug de commission
    console.error('[Partner] Erreur grantPartnerCommission:', err.message);
  }
}

// ─── Admin : liste des partenaires avec totaux ────────────────────────────────
// GET /api/admin/partners
async function getAdminPartners(req, res, next) {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' },
      include: { conversions: { include: { commissions: true } } },
    });

    const data = partners.map((p) => {
      const allCommissions = p.conversions.flatMap((c) => c.commissions);
      const totalDue = allCommissions
        .filter((c) => c.status === 'PENDING')
        .reduce((s, c) => s + c.commissionAmount, 0);
      const totalPaid = allCommissions
        .filter((c) => c.status === 'PAID')
        .reduce((s, c) => s + c.commissionAmount, 0);

      return {
        id: p.id,
        name: p.name,
        code: p.code,
        commissionRate: p.commissionRate,
        contact: p.contact,
        active: p.active,
        createdAt: p.createdAt,
        conversionCount: p.conversions.length,
        totalDue: Math.round(totalDue),
        totalPaid: Math.round(totalPaid),
      };
    });

    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// POST /api/admin/partners
async function createPartner(req, res, next) {
  try {
    const schema = z.object({
      name: z.string().min(2),
      code: z.string().min(3).max(20).optional(),
      commissionRate: z.number().min(0.01).max(1),
      contact: z.string().optional(),
    });
    const { name, code, commissionRate, contact } = schema.parse(req.body);

    let finalCode = code ? code.toUpperCase() : null;
    if (finalCode) {
      const exists = await prisma.partner.findUnique({ where: { code: finalCode } });
      if (exists) throw new AppError('Ce code est déjà utilisé', 400, 'CODE_TAKEN');
    } else {
      let unique = false;
      while (!unique) {
        finalCode = generateCode();
        // eslint-disable-next-line no-await-in-loop
        unique = !(await prisma.partner.findUnique({ where: { code: finalCode } }));
      }
    }

    const partner = await prisma.partner.create({
      data: { name, code: finalCode, commissionRate, contact: contact || null },
    });

    res.status(201).json({ success: true, data: partner });
  } catch (err) { next(err); }
}

// PATCH /api/admin/partners/:id
async function updatePartner(req, res, next) {
  try {
    const schema = z.object({
      name: z.string().min(2).optional(),
      commissionRate: z.number().min(0.01).max(1).optional(),
      contact: z.string().optional().nullable(),
      active: z.boolean().optional(),
    });
    const data = schema.parse(req.body);

    const partner = await prisma.partner.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: partner });
  } catch (err) { next(err); }
}

// GET /api/admin/partners/:id/commissions
async function getPartnerCommissions(req, res, next) {
  try {
    const commissions = await prisma.partnerCommission.findMany({
      where: { conversion: { partnerId: req.params.id } },
      include: {
        conversion: { include: { user: { select: { username: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: commissions });
  } catch (err) { next(err); }
}

// PATCH /api/admin/partners/commissions/:id/mark-paid
async function markCommissionPaid(req, res, next) {
  try {
    const commission = await prisma.partnerCommission.update({
      where: { id: req.params.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    res.json({ success: true, data: commission });
  } catch (err) { next(err); }
}

// PATCH /api/admin/partners/:id/mark-all-paid — versement mensuel groupé
async function markAllCommissionsPaid(req, res, next) {
  try {
    await prisma.partnerCommission.updateMany({
      where: { conversion: { partnerId: req.params.id }, status: 'PENDING' },
      data: { status: 'PAID', paidAt: new Date() },
    });
    res.json({ success: true, message: 'Commissions marquées comme payées' });
  } catch (err) { next(err); }
}

module.exports = {
  usePartnerCode,
  grantPartnerCommission,
  getAdminPartners,
  createPartner,
  updatePartner,
  getPartnerCommissions,
  markCommissionPaid,
  markAllCommissionsPaid,
};
