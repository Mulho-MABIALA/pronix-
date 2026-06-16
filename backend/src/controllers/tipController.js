const { z } = require('zod');
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// ─── Schéma de création d'un pronostic ────────────────────────────────────────
const createTipSchema = z.object({
  matchId: z.string().uuid(),
  prediction: z.enum(['HOME_WIN', 'DRAW', 'AWAY_WIN', 'OVER_2_5', 'UNDER_2_5', 'BTTS_YES', 'BTTS_NO']),
  confidence: z.number().int().min(1).max(5).optional(),
  analysis: z.string().max(500).optional(),
  isAiGenerated: z.boolean().optional().default(false),
});

// ─── Publier un pronostic ──────────────────────────────────────────────────────
async function createTip(req, res, next) {
  try {
    const data = createTipSchema.parse(req.body);

    const match = await prisma.match.findUnique({ where: { id: data.matchId } });
    if (!match) throw new AppError('Match introuvable', 404, 'NOT_FOUND');
    if (match.status !== 'SCHEDULED') {
      throw new AppError('Impossible de pronostiquer un match déjà commencé ou terminé', 400, 'INVALID_MATCH_STATUS');
    }
    if (new Date(match.scheduledAt) <= new Date()) {
      throw new AppError('Le match est déjà commencé', 400, 'MATCH_STARTED');
    }

    const tip = await prisma.tip.create({
      data: { ...data, userId: req.user.id },
      include: {
        match: { include: { competition: true } },
        user: { include: { profile: true, tipsterStats: true } },
      },
    });

    res.status(201).json({ success: true, data: tip });
  } catch (err) {
    next(err);
  }
}

// ─── Pronostics d'un match ─────────────────────────────────────────────────────
async function getTipsByMatch(req, res, next) {
  try {
    const { matchId } = req.params;
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, tips] = await prisma.$transaction([
      prisma.tip.count({ where: { matchId, isVisible: true } }),
      prisma.tip.findMany({
        where: { matchId, isVisible: true },
        include: {
          user: { include: { profile: true, tipsterStats: true } },
        },
        orderBy: [{ user: { tipsterStats: { successRate: 'desc' } } }, { createdAt: 'desc' }],
        skip,
        take: Number(limit),
      }),
    ]);

    res.json({ success: true, data: tips, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

// ─── Classement des tipsters ───────────────────────────────────────────────────
async function getLeaderboard(req, res, next) {
  try {
    const { period = 'global', page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const orderField = period === 'monthly' ? 'monthlyRate' : 'successRate';
    const rankField = period === 'monthly' ? 'monthlyRank' : 'globalRank';
    const minTips = 1;
    const tipsField = period === 'monthly' ? 'monthlyTips' : 'totalTips';

    const [total, stats] = await prisma.$transaction([
      prisma.tipsterStats.count({ where: { [tipsField]: { gte: minTips } } }),
      prisma.tipsterStats.findMany({
        where: { [tipsField]: { gte: minTips } },
        include: {
          user: { include: { profile: true } },
        },
        orderBy: [{ [orderField]: 'desc' }, { [tipsField]: 'desc' }],
        skip,
        take: Number(limit),
      }),
    ]);

    res.json({ success: true, data: stats, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

// ─── Profil public d'un tipster ───────────────────────────────────────────────
async function getTipsterProfile(req, res, next) {
  try {
    const { userId } = req.params;

    const [user, stats, recentTips] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true, tipsterStats: true },
      }),
      prisma.tipsterStats.findUnique({ where: { userId } }),
      prisma.tip.findMany({
        where: { userId, isVisible: true },
        include: { match: { include: { competition: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    if (!user) throw new AppError('Tipster introuvable', 404, 'NOT_FOUND');

    const { password: _, ...userSafe } = user;
    res.json({ success: true, data: { user: userSafe, stats, recentTips } });
  } catch (err) {
    next(err);
  }
}

// ─── Signalement d'un pronostic ───────────────────────────────────────────────
async function reportTip(req, res, next) {
  try {
    const { tipId } = req.params;
    const { reason } = z.object({ reason: z.string().min(10).max(300) }).parse(req.body);

    const tip = await prisma.tip.findUnique({ where: { id: tipId } });
    if (!tip) throw new AppError('Pronostic introuvable', 404, 'NOT_FOUND');
    if (tip.userId === req.user.id) {
      throw new AppError('Vous ne pouvez pas signaler votre propre pronostic', 400, 'INVALID_ACTION');
    }

    const report = await prisma.report.create({
      data: { reporterId: req.user.id, tipId, reason },
    });

    res.status(201).json({ success: true, message: 'Signalement envoyé', data: report });
  } catch (err) {
    next(err);
  }
}

// ─── Pronostics de l'utilisateur connecté ─────────────────────────────────────
async function getMyTips(req, res, next) {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [total, tips] = await prisma.$transaction([
      prisma.tip.count({ where: { userId: req.user.id } }),
      prisma.tip.findMany({
        where: { userId: req.user.id },
        include: { match: { include: { competition: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
    ]);

    res.json({ success: true, data: tips, pagination: { total, page: Number(page), limit: Number(limit) } });
  } catch (err) {
    next(err);
  }
}

module.exports = { createTip, getTipsByMatch, getLeaderboard, getTipsterProfile, reportTip, getMyTips };
