// Combinés / Multi — coupon de plusieurs picks
const prisma = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

// POST /api/combos — créer un combiné
async function createCombo(req, res, next) {
  try {
    const { title, isPremium = false, entries } = req.body;

    if (!Array.isArray(entries) || entries.length < 2) {
      throw new AppError('Un combiné nécessite au moins 2 sélections', 400, 'INVALID_COMBO');
    }
    if (entries.length > 15) {
      throw new AppError('Maximum 15 sélections par combiné', 400, 'COMBO_TOO_LARGE');
    }

    // Vérifier que tous les matchs existent
    const matchIds = [...new Set(entries.map((e) => e.matchId))];
    if (matchIds.length !== entries.length) {
      throw new AppError('Plusieurs picks sur le même match non autorisés', 400, 'DUPLICATE_MATCH');
    }

    const matches = await prisma.match.findMany({
      where: { id: { in: matchIds } },
      select: { id: true, status: true },
    });
    if (matches.length !== matchIds.length) {
      throw new AppError('Un ou plusieurs matchs introuvables', 404, 'MATCH_NOT_FOUND');
    }

    // Calculer la cote totale
    const totalOdds = entries.reduce((acc, e) => acc * (parseFloat(e.odds) || 1), 1);

    const combo = await prisma.tipCombo.create({
      data: {
        userId: req.user.id,
        title: title || null,
        totalOdds: parseFloat(totalOdds.toFixed(2)),
        isPremium: !!isPremium,
        entries: {
          create: entries.map((e) => ({
            matchId: e.matchId,
            prediction: e.prediction,
            odds: parseFloat(e.odds) || 1,
          })),
        },
      },
      include: {
        entries: {
          include: {
            match: {
              select: {
                id: true, homeTeam: true, awayTeam: true,
                scheduledAt: true, status: true,
                competition: { select: { name: true } },
              },
            },
          },
        },
        user: { select: { id: true, username: true, profile: { select: { displayName: true, avatar: true } } } },
      },
    });

    res.status(201).json({ success: true, data: combo });
  } catch (err) { next(err); }
}

// GET /api/combos?tipsterId=xxx&limit=20&page=1
async function listCombos(req, res, next) {
  try {
    const { tipsterId, limit = 20, page = 1 } = req.query;
    const take = Math.min(50, parseInt(limit));
    const skip = (parseInt(page) - 1) * take;

    const where = {};
    if (tipsterId) where.userId = tipsterId;

    // Les combinés premium ne sont visibles que par les abonnés ou le tipster lui-même
    const isOwner = tipsterId && req.user?.id === tipsterId;
    const isPremium = req.user?.subscription?.plan?.code !== 'FREE';
    if (!isOwner && !isPremium) {
      where.isPremium = false;
    }

    const [combos, total] = await Promise.all([
      prisma.tipCombo.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take, skip,
        include: {
          entries: {
            include: {
              match: {
                select: {
                  id: true, homeTeam: true, awayTeam: true,
                  scheduledAt: true, status: true, homeScore: true, awayScore: true,
                  competition: { select: { name: true } },
                },
              },
            },
          },
          user: {
            select: {
              id: true, username: true,
              profile: { select: { displayName: true, avatar: true } },
              tipsterStats: { select: { successRate: true, globalRank: true } },
            },
          },
        },
      }),
      prisma.tipCombo.count({ where }),
    ]);

    res.json({ success: true, data: combos, meta: { total, page: parseInt(page), limit: take } });
  } catch (err) { next(err); }
}

// GET /api/combos/:id
async function getCombo(req, res, next) {
  try {
    const combo = await prisma.tipCombo.findUnique({
      where: { id: req.params.id },
      include: {
        entries: {
          include: {
            match: {
              select: {
                id: true, homeTeam: true, awayTeam: true,
                scheduledAt: true, status: true, homeScore: true, awayScore: true,
                homeTeamLogo: true, awayTeamLogo: true,
                competition: { select: { name: true, logo: true } },
              },
            },
          },
        },
        user: {
          select: {
            id: true, username: true,
            profile: { select: { displayName: true, avatar: true } },
            tipsterStats: { select: { successRate: true, globalRank: true } },
          },
        },
      },
    });

    if (!combo) throw new AppError('Combiné introuvable', 404, 'NOT_FOUND');

    const isPremium = req.user?.subscription?.plan?.code !== 'FREE';
    const isOwner = req.user?.id === combo.userId;
    if (combo.isPremium && !isPremium && !isOwner) {
      throw new AppError('Abonnement Premium requis pour voir ce combiné', 403, 'PREMIUM_REQUIRED');
    }

    res.json({ success: true, data: combo });
  } catch (err) { next(err); }
}

// DELETE /api/combos/:id
async function deleteCombo(req, res, next) {
  try {
    const combo = await prisma.tipCombo.findUnique({ where: { id: req.params.id } });
    if (!combo) throw new AppError('Combiné introuvable', 404, 'NOT_FOUND');
    if (combo.userId !== req.user.id && req.user.role !== 'ADMIN') {
      throw new AppError('Non autorisé', 403, 'FORBIDDEN');
    }

    await prisma.tipCombo.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Combiné supprimé' });
  } catch (err) { next(err); }
}

// GET /api/combos/my — mes propres combinés
async function myСombos(req, res, next) {
  try {
    const combos = await prisma.tipCombo.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        entries: {
          include: {
            match: {
              select: {
                id: true, homeTeam: true, awayTeam: true,
                scheduledAt: true, status: true, homeScore: true, awayScore: true,
              },
            },
          },
        },
      },
    });
    res.json({ success: true, data: combos });
  } catch (err) { next(err); }
}

module.exports = { createCombo, listCombos, getCombo, deleteCombo, myСombos };
