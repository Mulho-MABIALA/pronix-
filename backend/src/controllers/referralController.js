const crypto = require('crypto');
const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// Génère un code référence unique (6 chars alphanumériques upper)
function generateCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
}

// GET /api/referrals/my-code  — obtenir (ou créer) son code
async function getMyCode(req, res, next) {
  try {
    let user = req.user;

    if (!user.referralCode) {
      let code;
      let exists = true;
      while (exists) {
        code = generateCode();
        exists = await prisma.user.findUnique({ where: { referralCode: code } });
      }
      user = await prisma.user.update({
        where: { id: user.id },
        data: { referralCode: code },
      });
    }

    // Compter les filleuls
    const referralCount = await prisma.referral.count({
      where: { referrerId: user.id },
    });
    const rewardedCount = await prisma.referral.count({
      where: { referrerId: user.id, status: 'REWARDED' },
    });

    res.json({
      success: true,
      data: {
        code: user.referralCode,
        referralCount,
        rewardedCount,
        shareUrl: `${process.env.FRONTEND_URL || 'https://fpronix.com'}?ref=${user.referralCode}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/referrals/use/:code  — enregistrer un parrainage à l'inscription
async function useReferralCode(req, res, next) {
  try {
    const { code } = z.object({ code: z.string().min(1) }).parse({ code: req.params.code });

    // Vérifier que l'utilisateur n'a pas déjà été parrainé
    const existingReferral = await prisma.referral.findUnique({
      where: { refereeId: req.user.id },
    });
    if (existingReferral) {
      throw new AppError('Tu as déjà utilisé un code de parrainage', 400, 'ALREADY_REFERRED');
    }

    // Trouver le parrain
    const referrer = await prisma.user.findUnique({
      where: { referralCode: code.toUpperCase() },
    });

    if (!referrer) {
      throw new AppError('Code de parrainage invalide', 404, 'INVALID_CODE');
    }

    if (referrer.id === req.user.id) {
      throw new AppError('Tu ne peux pas utiliser ton propre code', 400, 'SELF_REFERRAL');
    }

    const referral = await prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId: req.user.id,
        status: 'PENDING',
      },
    });

    // Mettre à jour referredById sur l'utilisateur
    await prisma.user.update({
      where: { id: req.user.id },
      data: { referredById: referrer.id },
    });

    res.status(201).json({ success: true, data: referral });
  } catch (err) {
    next(err);
  }
}

// GET /api/referrals/list  — liste des filleuls du parrain
async function getMyReferrals(req, res, next) {
  try {
    const referrals = await prisma.referral.findMany({
      where: { referrerId: req.user.id },
      include: {
        referee: {
          select: { id: true, username: true, createdAt: true, profile: { select: { displayName: true, avatar: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ success: true, data: referrals });
  } catch (err) {
    next(err);
  }
}

module.exports = { getMyCode, useReferralCode, getMyReferrals };
